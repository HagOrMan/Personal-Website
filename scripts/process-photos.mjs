#!/usr/bin/env node
/**
 * process-photos.mjs
 *
 * Takes a folder of mixed iPhone/camera photos (HEIC, JPEG, PNG, TIFF, WebP)
 * and produces a responsive AVIF + WebP set for each, plus a photos.json
 * manifest with dimensions, blur placeholders and dominant colours.
 *
 *   node scripts/process-photos.mjs ./photos-src ./photos-out
 *
 * Flags:
 *   --jpeg        also emit JPEG fallbacks (only needed for pre-2020 browsers)
 *   --force       reprocess everything, ignoring the existing manifest
 *   --jobs=N      parallel workers (default: min(cores, 4))
 *   --widths=...  comma-separated widths (see WIDTHS below)
 *
 * Requires sharp >= 0.33 and, for capture dates, exif-reader.
 *
 * HEIC needs a decoder sharp does not have. Its prebuilt libvips includes
 * libheif for AVIF but not the HEVC decoder plugin, which is patent
 * encumbered - so it will report an iPhone HEIC's dimensions quite happily and
 * then fail on the pixels. The script prefers a system decoder if one is
 * installed (`sips` on macOS, `heif-convert`, or `magick`) and otherwise falls
 * back to heic-convert, a pure-JS decoder that needs nothing installed.
 *
 * JPEG, PNG, TIFF, WebP and AVIF go straight through sharp with no extra
 * tooling.
 */

import { readdir, mkdir, writeFile, readFile, mkdtemp, rm, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir, cpus } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const run = promisify(execFile);

// ---------------------------------------------------------------- config ---

const argv = process.argv.slice(2);
const flags = new Map(
  argv.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const positional = argv.filter((a) => !a.startsWith('--'));

const SRC = path.resolve(positional[0] ?? 'photos-src');
const OUT = path.resolve(positional[1] ?? 'photos-out');
// Named to match the R2 prefix, so uploading is "drag photos-out/gallery into
// the bucket root" with no chance of landing the files at the wrong path.
const IMG_DIR = path.join(OUT, 'gallery');
const MANIFEST = path.join(OUT, 'photos.json');

/*
 * Responsive tiers. Five widths, two formats: ten files per photo.
 *
 * 480/800/1200 are the only ones the wall ever fetches. Tiles render 101-563
 * CSS px (median ~245) at a 180px row height, so 2x DPR tops out around
 * 1126px - and `sizes` in PhotoWall.tsx is a fixed pixel value rather than a
 * vw expression, which caps what the browser is willing to pick at all.
 *
 * 2400 and 3200 are for looking at a photo full-screen: a lightbox, or just
 * opening the file. 2400 covers portraits (a 12MP iPhone portrait is only
 * 3024px wide), 3200 the landscapes worth showing off. The wall cannot pull
 * them by accident, and they cost only R2 storage, which is billed per GB
 * with no egress fee.
 *
 * Not included: 320, which only ever wins for portrait tiles in the 700-939px
 * band where 480 is a few KB more; and 1600, which sits between 1200 and 2400
 * serving neither.
 *
 * targetWidths() never upscales, so the real ceiling for any photo is the
 * largest tier at or below its native width: 3200 for a 4032px iPhone
 * landscape, 2400 for the 3024px portrait of that same shot.
 *
 * Changing this list changes REV and reprocesses every photo, so settle on it
 * before the first full run.
 */
const WIDTHS = String(flags.get('widths') ?? '480,800,1200,2400,3200')
  .split(',')
  .map(Number)
  .filter(Boolean)
  .sort((a, b) => a - b);

const WANT_JPEG = flags.has('jpeg');
const FORCE = flags.has('force');
const JOBS = Number(flags.get('jobs')) || Math.min(cpus().length, 4);

// Encoder settings. AVIF q50 is roughly equivalent to JPEG q80 on photographic
// content at about half the bytes. This sits at 60 instead: the large tiers
// above are meant to be looked at full-screen on a desktop display, and the
// extra bytes are only paid by the handful of viewers who open one.
const OPTIONS = {
  avif: { quality: 60, effort: 6, chromaSubsampling: '4:2:0' },
  webp: { quality: 78, effort: 5, smartSubsample: true },
  jpeg: { quality: 80, progressive: true, mozjpeg: true },
};

const FORMATS = WANT_JPEG ? ['avif', 'webp', 'jpeg'] : ['avif', 'webp'];
const EXT = { avif: 'avif', webp: 'webp', jpeg: 'jpg' };

// Fingerprint of every setting that affects output bytes. Stored on each
// manifest entry so that changing a quality or a width invalidates the cache
// instead of being silently ignored on the next run.
const REV = createHash('sha256')
  .update(JSON.stringify({ WIDTHS, FORMATS, OPTIONS }))
  .digest('hex')
  .slice(0, 6);

/** Which widths we generate for an image of this native width. */
const targetWidths = (native) => {
  const fitting = WIDTHS.filter((w) => w <= native);
  return fitting.length ? fitting : [native]; // never upscale past the original
};

const SUPPORTED = new Set([
  '.heic', '.heif', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.avif',
]);
const isHeic = (f) => /\.hei[cf]$/i.test(f);

// ------------------------------------------------------- HEIC fallbacks ---

let heicTool; // memoised: string | null

const IS_WINDOWS = process.platform === 'win32';

/*
 * External decoders to try, in order of preference. sharp only reads HEIC when
 * its libvips was built with HEVC support, which the prebuilt binaries are
 * not - they ship AV1 and leave HEVC out because it is patent encumbered. So
 * on a stock `npm install sharp`, every iPhone HEIC takes this path.
 *
 * `convert` is deliberately absent on Windows. There it resolves to
 * C:\Windows\System32\convert.exe, the FAT-to-NTFS volume converter, which has
 * nothing to do with ImageMagick and would fail in a thoroughly confusing way.
 * Use `magick` (ImageMagick 7). `sips` is macOS-only and never matches here.
 */
const HEIC_TOOLS = IS_WINDOWS
  ? ['magick']
  : ['sips', 'heif-convert', 'magick', 'convert'];

async function hasCommand(cmd) {
  try {
    // `where` on Windows, `command -v` under a POSIX shell everywhere else.
    // Node cannot spawn /bin/sh on Windows even when called from Git Bash:
    // the MSYS path mapping happens inside the shell, not in the spawner.
    if (IS_WINDOWS) await run('where', [cmd], { windowsHide: true });
    else await run('/bin/sh', ['-c', `command -v ${cmd}`]);
    return true;
  } catch {
    return false;
  }
}

/*
 * The ImageMagick installer for Windows routinely leaves `magick` off PATH, so
 * look in the default install location before giving up and falling back to
 * the much slower pure-JS decoder. execFile takes an absolute path just as
 * happily as a bare command name.
 */
async function findMagickOnWindows() {
  const bases = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']];
  for (const base of bases) {
    if (!base) continue;
    let names;
    try {
      names = await readdir(base);
    } catch {
      continue;
    }
    // Newest version first, so a machine with several installs picks the one
    // most likely to have a current libheif.
    const dirs = names.filter((n) => /^ImageMagick-/i.test(n)).sort().reverse();
    for (const dir of dirs) {
      const exe = path.join(base, dir, 'magick.exe');
      try {
        await access(exe);
        return exe;
      } catch { /* try the next install */ }
    }
  }
  return null;
}

async function findHeicTool() {
  if (heicTool !== undefined) return heicTool;
  for (const cmd of HEIC_TOOLS) {
    if (await hasCommand(cmd)) {
      heicTool = cmd;
      return cmd;
    }
  }
  heicTool = IS_WINDOWS ? await findMagickOnWindows() : null;
  return heicTool;
}

/** Decode a HEIC to an intermediate buffer using an external tool. */
async function heicToBuffer(file, raw) {
  const tool = await findHeicTool();

  if (tool) {
    const dir = await mkdtemp(path.join(tmpdir(), 'heic-'));
    try {
      if (tool === 'sips') {
        // TIFF keeps the wide-gamut profile intact through the handoff.
        const out = path.join(dir, 'out.tiff');
        await run('sips', ['-s', 'format', 'tiff', file, '--out', out]);
        return await readFile(out);
      }
      const out = path.join(dir, 'out.png');
      if (tool === 'heif-convert') await run('heif-convert', [file, out]);
      else await run(tool, [file, out]);
      return await readFile(out);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  // No system decoder. heic-convert is a pure-JS HEVC decoder - perhaps ten
  // times slower than libde265 native, but it needs nothing installed, which
  // on Windows is the difference between working and not.
  try {
    const { default: convert } = await import('heic-convert');
    // PNG rather than JPEG: lossless into the sharp pipeline, so the only
    // lossy step is the AVIF/WebP encode at the end.
    return await convert({ buffer: raw, format: 'PNG' });
  } catch (err) {
    if (err?.code !== 'ERR_MODULE_NOT_FOUND') throw err;
    throw new Error(
      'Cannot decode HEIC: sharp has no HEVC support and no decoder was found.\n' +
        '  any:     pnpm add -D heic-convert          (pure JS, no system install)\n' +
        '  Windows: winget install ImageMagick.ImageMagick\n' +
        '  macOS:   sips is built in (you should not see this)\n' +
        '  Linux:   apt install libheif-examples      # provides heif-convert'
    );
  }
}

/*
 * Whether this sharp build can actually decode HEIC, probed once.
 *
 * metadata() is not a usable test: libvips here has libheif compiled in for
 * AVIF, so it parses the HEIC container and reports dimensions quite happily.
 * Only the pixel decode fails, with "Support for this compression format has
 * not been built in" - and by then we are past the fallback. So force a real
 * decode of a tiny resize and see whether it survives.
 */
let sharpReadsHeic;

async function canSharpDecodeHeic(raw) {
  if (sharpReadsHeic !== undefined) return sharpReadsHeic;
  try {
    await sharp(raw).resize({ width: 8 }).raw().toBuffer();
    sharpReadsHeic = true;
  } catch {
    sharpReadsHeic = false;
  }
  return sharpReadsHeic;
}

/** Return a decodable buffer for any supported input. */
async function readDecodable(file) {
  const raw = await readFile(file);
  if (!isHeic(file)) return raw;
  if (await canSharpDecodeHeic(raw)) return raw;
  return heicToBuffer(file, raw);
}

// ------------------------------------------------------------- pipeline ---

/**
 * Apply EXIF orientation, colour-manage into sRGB, and drop all other
 * metadata (this is what removes the GPS coordinates).
 */
function normalise(buffer) {
  const p = sharp(buffer, { failOn: 'none' }).rotate();
  if (typeof p.withIccProfile !== 'function') {
    // The sharp < 0.33 equivalent keeps EXIF (and therefore your GPS
    // coordinates), so refuse rather than quietly publishing them.
    throw new Error('sharp >= 0.33 required: npm install sharp@latest');
  }
  // attach:false still performs the P3 -> sRGB transform, it just skips
  // embedding the profile. Untagged images are treated as sRGB everywhere,
  // and this saves ~500 bytes per file — meaningful on 480px thumbnails.
  return p.withIccProfile('srgb', { attach: false });
}

const slug = (s) =>
  s
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

const hex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/** Pull the capture date out of EXIF, if exif-reader is installed. */
async function takenAt(buffer) {
  try {
    const { exif } = await sharp(buffer).metadata();
    if (!exif) return null;
    const { default: parse } = await import('exif-reader');
    const tags = parse(exif);
    const d =
      tags?.Photo?.DateTimeOriginal ?? tags?.Image?.DateTime ?? null;
    return d ? new Date(d).toISOString() : null;
  } catch {
    return null; // exif-reader not installed, or no date present
  }
}

async function processOne(file) {
  const source = await readFile(file);
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 8);
  const stem = slug(path.basename(file, path.extname(file)));
  const id = `${stem}-${hash}`;

  const buffer = await readDecodable(file);
  const meta = await normalise(buffer).toBuffer({ resolveWithObject: true });
  const { width, height } = meta.info;

  const widths = targetWidths(width);

  await Promise.all(
    widths.flatMap((w) =>
      FORMATS.map((fmt) =>
        normalise(buffer)
          .resize({ width: w, withoutEnlargement: true })
          [fmt](OPTIONS[fmt])
          .toFile(path.join(IMG_DIR, `${id}-${w}.${EXT[fmt]}`))
      )
    )
  );

  const blur = await normalise(buffer)
    .resize({ width: 20 })
    .webp({ quality: 25, alphaQuality: 0 })
    .toBuffer();

  let color = '#e5e5e5';
  try {
    const { dominant } = await sharp(buffer).stats();
    color = hex(dominant);
  } catch { /* stats can fail on odd colourspaces; the default is fine */ }

  return {
    id,
    rev: REV,
    width,
    height,
    aspectRatio: Number((width / height).toFixed(4)),
    widths,
    formats: FORMATS.map((f) => EXT[f]),
    color,
    blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
    // Prefer the untouched original: an external HEIC decode drops or mangles
    // most EXIF, and for non-HEIC inputs `source` and `buffer` are the same
    // bytes anyway. Falls back to the decoded copy, then to null.
    takenAt: (await takenAt(source)) ?? (await takenAt(buffer)),
    alt: '', // fill these in by hand — they are what make the wall accessible
    sourceFile: path.basename(file),
  };
}

// ----------------------------------------------------------------- main ---

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let i = cursor++; i < items.length; i = cursor++) {
        out[i] = await worker(items[i], i);
      }
    })
  );
  return out;
}

// The manifest that ships with the site. photos-out/ is gitignored, so this
// is the only durable copy of the alt text - a fresh clone, or a cleared
// output folder, would otherwise silently lose every description.
const COMMITTED = path.resolve('src', 'data', 'photos.json');

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return [];
  }
}

async function loadManifest() {
  const previous = FORCE ? [] : await readJson(MANIFEST);

  // Alt text is merged from both manifests, the working one winning, so you
  // can write descriptions in either place. Note this is used for alt only,
  // never to skip work: the committed manifest says nothing about whether the
  // image files are actually on disk.
  const alt = new Map();
  for (const list of [await readJson(COMMITTED), previous])
    for (const e of list) if (e?.alt) alt.set(e.id, e.alt);

  return { previous, alt };
}

async function outputsExist(entry) {
  const checks = entry.widths.flatMap((w) =>
    entry.formats.map((f) => access(path.join(IMG_DIR, `${entry.id}-${w}.${f}`)))
  );
  return Promise.all(checks).then(() => true, () => false);
}

async function main() {
  await mkdir(IMG_DIR, { recursive: true });

  const entries = await readdir(SRC, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && SUPPORTED.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(SRC, e.name))
    .sort();

  if (!files.length) {
    console.error(`No supported images in ${SRC}`);
    process.exit(1);
  }

  const { previous, alt } = await loadManifest();
  const byId = new Map(previous.map((e) => [e.id, e]));

  console.log(
    `${files.length} images -> ${FORMATS.join('/')} @ ${WIDTHS.join(',')}px  (${JOBS} workers)`
  );

  let done = 0;
  let skipped = 0;
  const failures = [];

  const results = await pool(files, JOBS, async (file) => {
    try {
      // Cheap skip: same bytes, same id, outputs already on disk.
      const hash = createHash('sha256')
        .update(await readFile(file))
        .digest('hex')
        .slice(0, 8);
      const id = `${slug(path.basename(file, path.extname(file)))}-${hash}`;
      const cached = byId.get(id);
      if (cached?.rev === REV && (await outputsExist(cached))) {
        // Still pick up alt text added to src/data/photos.json since last run.
        if (!cached.alt && alt.has(id)) cached.alt = alt.get(id);
        skipped++;
        process.stdout.write(`\r  ${++done}/${files.length}`);
        return cached;
      }

      const entry = await processOne(file);
      // Preserve any alt text already written for this image, from either
      // photos-out/photos.json or the committed src/data/photos.json.
      if (alt.has(id)) entry.alt = alt.get(id);
      process.stdout.write(`\r  ${++done}/${files.length}`);
      return entry;
    } catch (err) {
      failures.push({ file: path.basename(file), message: err.message });
      process.stdout.write(`\r  ${++done}/${files.length}`);
      return null;
    }
  });

  const manifest = results
    .filter(Boolean)
    .sort((a, b) => (b.takenAt ?? '').localeCompare(a.takenAt ?? ''));

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`\nWrote ${manifest.length} entries to ${MANIFEST}` +
    (skipped ? ` (${skipped} unchanged, skipped)` : ''));

  if (failures.length) {
    console.log(`\n${failures.length} failed:`);
    for (const f of failures) console.log(`  ${f.file}: ${f.message}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
