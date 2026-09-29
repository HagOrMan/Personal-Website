#!/usr/bin/env node
/**
 * process-music.mjs
 *
 * Exports every score in music-src/ through the MuseScore CLI, turns the
 * results into what /music serves under music-out/music/, and records their
 * R2 keys in src/data/music.json. Uploading is manual: drag
 * music-out/music into the bucket root.
 *
 *   pnpm music                      export changed pieces, update the manifest
 *   pnpm music --only=slug,slug     just these pieces
 *   pnpm music --force              redo pieces whose source hasn't changed
 *
 * Per piece, from music-src/{slug}.mscz (slug must match src/constant/music.ts):
 *
 *   audio.mp3      WAV from MuseScore -> two-pass loudness normalisation ->
 *                  MP3 with ID3 title/artist/year/copyright
 *   score.pdf
 *   page-NN.svg    one per page, zero-padded
 *   og.png         page 1, for the share card and index thumbnails
 *
 * all under music/{slug}/{hash}/, where the hash is of the .mscz. Objects are
 * cached for a year as immutable, so the key has to change whenever the
 * content does: edit the score and it gets a new hash and a new folder. The
 * one case the hash can't see is the same score rendering differently (a
 * Muse Sounds update, a change to the settings below) - bump REV or pass
 * --force for that.
 *
 * music-out/ only ever holds those four file types, so uploading the whole
 * folder is safe. The .mscz, the WAV and anything else MuseScore writes stay
 * in a temp folder - see "What never gets published" in scripts/README.md.
 *
 * Needs MuseScore (MSCORE=path overrides the search below) and ffmpeg +
 * ffprobe on PATH.
 */

import { access, copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ts from 'typescript';

const exec = promisify(execFile);

// ---------------------------------------------------------------- config ---

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'music-src');
const OUT = path.join(ROOT, 'music-out');
// Named to match the R2 prefix, like photos-out/gallery.
const OUT_MUSIC = path.join(OUT, 'music');
const CONSTANTS = path.join(ROOT, 'src/constant/music.ts');
const MANIFEST = path.join(ROOT, 'src/data/music.json');

/**
 * Folded into every hash. Bump it when anything below changes what gets
 * exported, so every piece is redone under new keys instead of the old,
 * forever-cached URLs serving the old files.
 */
const REV = 1;

const ARTIST = 'Kyle Hagerman';

/*
 * Loudness. -18 LUFS rather than the -14/-16 streaming targets: these are
 * mostly acoustic pieces with real dynamics, and a hotter target pushes
 * quiet-to-loud pieces into ffmpeg's dynamic mode, which compresses them.
 * LRA=20 for the same reason. The second pass runs in linear mode - one gain
 * change for the whole file, dynamics untouched - and the script warns if
 * ffmpeg had to fall back.
 */
const LOUDNORM = 'I=-18:TP=-1.5:LRA=20';
const MP3_BITRATE = '256k';

// Page 1 as PNG: exported at PNG_DPI, then scaled to OG_HEIGHT. 1260 is twice
// the share card's height, so index thumbnails stay sharp on retina screens.
const PNG_DPI = 150;
const OG_HEIGHT = 1260;

const argv = process.argv.slice(2);
const flags = new Map(
  argv
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    }),
);
const FORCE = flags.has('force');
const ONLY = typeof flags.get('only') === 'string'
  ? new Set(flags.get('only').split(','))
  : null;

// ----------------------------------------------------------- composition ---

/**
 * Reads COMPOSITIONS straight out of src/constant/music.ts, so titles and
 * years are written once. TypeScript strips the types and the `import type`
 * line; a value import there would survive and fail to resolve here.
 */
async function loadCompositions() {
  const source = await readFile(CONSTANTS, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  const { COMPOSITIONS } = await import(url);
  return COMPOSITIONS;
}

// ----------------------------------------------------------------- tools ---

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function findMuseScore() {
  if (process.env.MSCORE) return process.env.MSCORE;

  const candidates = {
    win32: [
      'C:\\Program Files\\MuseScore 4\\bin\\MuseScore4.exe',
      'C:\\Program Files\\MuseScore 3\\bin\\MuseScore3.exe',
      'C:\\Program Files (x86)\\MuseScore 3\\bin\\MuseScore3.exe',
    ],
    darwin: [
      '/Applications/MuseScore 4.app/Contents/MacOS/mscore',
      '/Applications/MuseScore 3.app/Contents/MacOS/mscore',
    ],
  }[process.platform] ?? [];

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  // On Linux, and anywhere else, hope it's on PATH.
  return process.platform === 'win32' ? null : 'mscore';
}

async function requireTool(command, args = ['-version']) {
  try {
    await exec(command, args);
  } catch {
    throw new Error(`\`${command}\` not found on PATH - see scripts/README.md.`);
  }
}

// MuseScore is a GUI app; without a display on Linux it needs Qt told so.
const MSCORE_ENV = process.platform === 'linux'
  ? { ...process.env, QT_QPA_PLATFORM: 'offscreen' }
  : process.env;

async function museScore(mscore, args) {
  try {
    await exec(mscore, args, { env: MSCORE_ENV, maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    throw new Error(`MuseScore failed: ${mscore} ${args.join(' ')}\n${err.stderr ?? err.message}`);
  }
}

// ---------------------------------------------------------------- export ---

/**
 * MuseScore writes one file per page as {name}-1.ext, {name}-2.ext, ... Just
 * in case a one-page score comes out unnumbered, {name}.ext counts as page 1.
 */
async function pageFiles(dir, name, ext) {
  const pattern = new RegExp(`^${name}(?:-(\\d+))?\\.${ext}$`);
  return (await readdir(dir))
    .map((file) => ({ file, match: file.match(pattern) }))
    .filter(({ match }) => match)
    .map(({ file, match }) => ({ file: path.join(dir, file), page: Number(match[1] ?? 1) }))
    .sort((a, b) => a.page - b.page)
    .map(({ file }) => file);
}

/** Page proportions from the SVG's viewBox, falling back to width/height. */
async function svgSize(file) {
  const head = (await readFile(file, 'utf8')).slice(0, 2000);
  const viewBox = head.match(/viewBox="[\d.\s-]*?\s([\d.]+)\s+([\d.]+)"/);
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  const width = head.match(/\swidth="([\d.]+)/);
  const height = head.match(/\sheight="([\d.]+)/);
  if (width && height) return { width: Number(width[1]), height: Number(height[1]) };
  throw new Error(`Couldn't read the page size from ${file}`);
}

async function encodeAudio(wav, mp3, composition) {
  const measure = await exec(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', wav, '-af', `loudnorm=${LOUDNORM}:print_format=json`, '-f', 'null', '-'],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const report = measure.stderr;
  const m = JSON.parse(report.slice(report.lastIndexOf('{'), report.lastIndexOf('}') + 1));

  const filter = [
    `loudnorm=${LOUDNORM}`,
    `measured_I=${m.input_i}`,
    `measured_TP=${m.input_tp}`,
    `measured_LRA=${m.input_lra}`,
    `measured_thresh=${m.input_thresh}`,
    `offset=${m.target_offset}`,
    'linear=true',
    'print_format=summary',
  ].join(':');

  const encode = await exec(
    'ffmpeg',
    [
      '-hide_banner', '-nostats', '-y',
      '-i', wav,
      '-af', filter,
      // loudnorm resamples to 192kHz internally.
      '-ar', '44100',
      '-c:a', 'libmp3lame', '-b:a', MP3_BITRATE,
      '-map_metadata', '-1',
      '-id3v2_version', '3',
      '-metadata', `title=${composition.title}`,
      '-metadata', `artist=${ARTIST}`,
      '-metadata', `album_artist=${ARTIST}`,
      '-metadata', `date=${composition.year}`,
      '-metadata', `copyright=© ${composition.year} ${ARTIST}. All rights reserved.`,
      mp3,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );

  if (/Normalization Type:\s*Dynamic/i.test(encode.stderr)) {
    console.warn(
      `  ! ${composition.slug}: couldn't normalise linearly, so ffmpeg compressed the dynamics.\n` +
        '    Listen to it. If it sounds squashed, lower I= in LOUDNORM and bump REV.',
    );
  }

  const probe = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]);
  return Math.round(Number(probe.stdout.trim()));
}

async function processPiece(mscore, composition, source, hash) {
  const { slug } = composition;
  const prefix = `music/${slug}/${hash}`;
  const outDir = path.join(OUT, prefix);
  const work = await mkdtemp(path.join(tmpdir(), `music-${slug}-`));

  try {
    // Only the newest export of a piece is kept locally, so music-out/ shows
    // exactly what the manifest points at.
    await rm(path.join(OUT_MUSIC, slug), { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });

    console.log(`  exporting from MuseScore...`);
    await museScore(mscore, ['-o', path.join(work, 'score.pdf'), source]);
    await museScore(mscore, ['-o', path.join(work, 'page.svg'), source]);
    await museScore(mscore, ['-r', String(PNG_DPI), '-o', path.join(work, 'page.png'), source]);
    await museScore(mscore, ['-o', path.join(work, 'audio.wav'), source]);

    await copyFile(path.join(work, 'score.pdf'), path.join(outDir, 'score.pdf'));

    const svgs = await pageFiles(work, 'page', 'svg');
    if (svgs.length === 0) throw new Error('MuseScore produced no SVG pages.');
    const pad = Math.max(2, String(svgs.length).length);
    const pages = [];
    for (const [index, svg] of svgs.entries()) {
      const name = `page-${String(index + 1).padStart(pad, '0')}.svg`;
      await copyFile(svg, path.join(outDir, name));
      pages.push(`${prefix}/${name}`);
    }
    const { width: pageWidth, height: pageHeight } = await svgSize(svgs[0]);

    const [firstPng] = await pageFiles(work, 'page', 'png');
    if (!firstPng) throw new Error('MuseScore produced no PNG pages.');
    await sharp(firstPng)
      .flatten({ background: '#ffffff' })
      .resize({ height: OG_HEIGHT })
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, 'og.png'));

    console.log(`  encoding audio...`);
    const durationSeconds = await encodeAudio(
      path.join(work, 'audio.wav'),
      path.join(outDir, 'audio.mp3'),
      composition,
    );

    return {
      hash,
      audio: `${prefix}/audio.mp3`,
      pdf: `${prefix}/score.pdf`,
      og: `${prefix}/og.png`,
      pages,
      pageWidth,
      pageHeight,
      durationSeconds,
    };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ main ---

async function main() {
  const compositions = await loadCompositions();
  const known = new Set(compositions.map((c) => c.slug));

  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  for (const slug of Object.keys(manifest)) {
    if (!known.has(slug)) {
      console.warn(`! ${slug} is in music.json but not constant/music.ts - dropping it.`);
      delete manifest[slug];
    }
  }

  await mkdir(SRC, { recursive: true });
  const sources = new Set(
    (await readdir(SRC)).filter((f) => f.endsWith('.mscz')).map((f) => f.slice(0, -5)),
  );
  for (const slug of sources) {
    if (!known.has(slug)) console.warn(`! music-src/${slug}.mscz has no entry in constant/music.ts - skipping.`);
  }

  const todo = [];
  for (const composition of compositions) {
    if (ONLY && !ONLY.has(composition.slug)) continue;
    if (!sources.has(composition.slug)) {
      console.warn(`! No music-src/${composition.slug}.mscz - leaving ${composition.slug} as it is.`);
      continue;
    }
    const source = path.join(SRC, `${composition.slug}.mscz`);
    const digest = createHash('sha256').update(`rev${REV}`).update(await readFile(source));
    if (FORCE) digest.update(randomBytes(8));
    const hash = digest.digest('hex').slice(0, 10);

    if (manifest[composition.slug]?.hash === hash) {
      console.log(`= ${composition.slug} unchanged`);
      continue;
    }
    todo.push({ composition, source, hash });
  }

  if (todo.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  await Promise.all([requireTool('ffmpeg'), requireTool('ffprobe')]);
  const mscore = await findMuseScore();
  if (!mscore) throw new Error('MuseScore not found. Set MSCORE to the path of MuseScore4.exe / MuseScore3.exe.');
  console.log(`Using ${mscore}\n`);

  let failed = 0;
  const exported = [];
  for (const { composition, source, hash } of todo) {
    console.log(`> ${composition.slug}`);
    try {
      manifest[composition.slug] = await processPiece(mscore, composition, source, hash);
      exported.push(`music/${composition.slug}/${hash}`);
    } catch (err) {
      failed++;
      console.error(`  x ${err.message}`);
    }
  }

  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);

  if (failed) {
    console.error(`\n${failed} piece(s) failed; see above. Their manifest entries were left as they were.`);
    process.exitCode = 1;
  }
  if (exported.length === 0) return;

  // The manifest now points at these keys, so pushing it before the upload
  // ships pages whose audio, score and share image all 404.
  console.log(`\nUpdated ${path.relative(ROOT, MANIFEST)}. Before committing it:`);
  console.log('  1. Listen to each new MP3 - see "Check the audio" in scripts/README.md.');
  console.log('  2. Upload these folders from music-out/ to the same paths in the bucket:');
  for (const folder of exported) console.log(`       ${folder}/`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
