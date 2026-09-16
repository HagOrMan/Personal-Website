# Photo wall pipeline

Turns a folder of iPhone exports into responsive AVIF/WebP sets on Cloudflare
R2, plus a manifest that `src/components/gallery/PhotoWall.tsx` imports at
build time. The wall is static HTML - nothing is fetched at runtime.

```
photos-src/  ->  process-photos.mjs  ->  photos-out/gallery/  ->  R2, gallery/
                                              |
                                              +-> photos.json -> src/data/photos.json (committed)
```

The output folder is named `gallery` to match the R2 prefix, so publishing is
"drag `photos-out/gallery` into the bucket root" with no chance of landing the
files at the wrong path. `photos-src/` and `photos-out/` are both gitignored;
only the manifest is committed.

## One-time setup

**1. Install dependencies.**

```bash
pnpm install
```

- `sharp` resizes and encodes. It is already in the lockfile as an optional
  dependency of Next, but pnpm's strict `node_modules` means a transitive
  dependency is not importable from our own scripts - hence the explicit
  devDependency, pinned to the same 0.34.x Next already resolved so only one
  copy of the native binary is installed.
- `exif-reader` reads capture dates, so the wall sorts newest-first.
- `heic-convert` decodes HEIC. See below for why it is needed.

**2. HEIC decoding (optional, but faster).** sharp's prebuilt libvips has
libheif compiled in for AVIF but *not* the HEVC decoder, which is patent
encumbered - so it will parse an iPhone HEIC's dimensions quite happily and
then fail on the actual pixels. `heic-convert` handles this in pure JS with
nothing installed, which is what makes `pnpm install` sufficient.

It is roughly ten times slower than a native decoder. If you have a lot of
HEICs and the wait annoys you, install a system decoder and the script will
prefer it automatically:

```bash
winget install ImageMagick.ImageMagick     # Windows
brew install imagemagick                   # macOS (or rely on built-in sips)
sudo apt install libheif-examples          # Linux
```

On Windows the installer often skips the PATH entry, so the script also looks
in `C:\Program Files\ImageMagick-*\magick.exe` directly - no terminal restart
needed. It never looks for `convert`: on Windows that is
`C:\Windows\System32\convert.exe`, the FAT-to-NTFS volume converter.

**3. Create an R2 custom domain.** Cloudflare dashboard > R2 > your bucket >
Settings > Custom Domains. Do **not** use the `r2.dev` URL - it is rate limited
and unsupported for production. The wall shares the bucket already used for
portfolio videos, under a `gallery/` prefix.

**4. Set `NEXT_PUBLIC_R2_BASE_URL`** to that custom domain, no trailing slash,
in `.env.local` and in the Vercel project settings.

**5. Add a cache rule** so the images are cached forever. See "Caching" below.

## Processing photos

Drop the originals - HEIC, JPEG, or a mix - into `photos-src/`, then:

```bash
pnpm photos
```

It writes `photos-out/gallery/{id}-{width}.{avif,webp}` and
`photos-out/photos.json`, printing progress and a final count. Confirm it
reports zero failures before going further.

Each photo becomes ten files: five widths (480, 800, 1200, 2400, 3200) in
both AVIF and WebP. The wall only ever fetches 480/800/1200 - `sizes` is a
fixed pixel value, so the browser cannot pick a larger one. 2400 and 3200 are
there for full-screen viewing and a future lightbox. WebP exists because this
project supports Edge 111, and Edge only enabled AVIF by default in 121.

Notes:

- **Reruns are cheap.** Files are keyed by a content hash; unchanged photos are
  skipped and their alt text is carried over. Adding new photos only processes
  the new ones.
- **Changing widths or quality reprocesses everything**, because those settings
  are fingerprinted into each entry. Settle on them before the first big run.
- **EXIF is stripped**, GPS coordinates included. Capture dates are lifted out
  of the original file first and kept in the manifest.
- Photos are never upscaled. The largest file for any photo is the biggest tier
  at or below its native width - 3200px for a 4032px iPhone landscape, 2400px
  for the 3024px-wide portrait of that same shot.

Flags: `--force` to ignore the cache, `--jobs=N` for parallelism,
`--widths=...` to override the tiers, `--jpeg` to add JPEG fallbacks (only
needed for browsers older than this project's browserslist).

## Alt text

Alt text goes in the **`alt`** field of each entry, in either manifest:

- `photos-out/photos.json` - the working copy, right after a run
- `src/data/photos.json` - the committed copy the site actually builds from

The script reads both and merges them, so it does not matter which one you
edit, and nothing is lost when `photos-out/` is deleted or a fresh clone has no
output folder at all. `sourceFile` on each entry tells you which photo you are
describing.

Whichever you edit, make sure the change ends up in `src/data/photos.json` and
gets committed - that is the one the build reads. A wall of unlabelled images
is invisible to a screen reader.

## Publishing to R2

Copy the manifest into the app and commit it:

```bash
cp photos-out/photos.json src/data/photos.json
```

Then drag the whole `photos-out/gallery` folder into the bucket root in the
Cloudflare dashboard. Objects should end up at `gallery/<filename>` - that is
exactly what `PhotoWall.tsx` builds URLs for:

```
${NEXT_PUBLIC_R2_BASE_URL}/gallery/{id}-{width}.{ext}
```

Filenames carry a content hash, so re-uploading is always safe and never needs
a cache purge. Set caching with a rule rather than per object - see below.

`upload-r2.sh` does the same from the command line (it needs the AWS CLI and an
R2 API token) and sets `content-type` and `cache-control` per object as it
goes. Worth switching to once dragging a few hundred files gets old; otherwise
safe to delete.

## Caching

The dashboard uploader does not set `cache-control`, so without this the CDN
falls back to a short default TTL and repeat visitors re-download the wall.

In the Cloudflare dashboard, on the zone serving your custom domain: **Caching
> Cache Rules > Create rule**.

- If **URI Path starts with** `/gallery/`
- Then **Eligible for cache**, **Edge TTL: 1 year**, **Browser TTL: 1 year**

The filenames are content-hashed, so a year is safe - changing a photo changes
its URL.

## Verifying

- `curl -I https://<your-domain>/gallery/<some-id>-800.avif` returns 200 with a
  long-lived `cache-control` (or `cf-cache-status: HIT` on a second request).
- View source on `/gallery` shows the `<picture>` markup inline - no client
  fetch.
- DevTools Network at desktop width loads 800 or 1200 files for typical tiles
  on a retina display, 480 or 800 at 1x - never 2400 or 3200.
- No layout shift on load; every tile carries `aspect-ratio` and intrinsic
  `width`/`height`.

