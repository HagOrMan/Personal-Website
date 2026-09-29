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
libheif compiled in for AVIF but _not_ the HEVC decoder, which is patent
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

In the Cloudflare dashboard, on the zone serving your custom domain: \*\*Caching

> Cache Rules > Create rule\*\*.

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

---

# Music pipeline

Turns MuseScore scores into everything `/music` serves and records the R2 keys
in `src/data/music.json` (committed). You upload the files yourself. Runs
locally, never in CI or at build time.

```
music-src/{slug}.mscz  ->  process-music.mjs  ->  music-out/music/{slug}/{hash}/  ->  R2, music/
                                                        |
                                                        +-> src/data/music.json (committed)
```

Per piece: `audio.mp3`, `score.pdf`, `page-01.svg`, `page-02.svg`, ... and
`og.png` (page 1, used for the share card and the index thumbnail).

## One-time setup

1. **MuseScore.** MuseScore 4 with **Muse Sounds** installed is strongly
   recommended: the recording is the part visitors will judge the most, and
   Muse Sounds is a big step up from the basic soundfont. MuseScore 3 also
   works. The script checks the default install folders; if yours is somewhere
   else, set `MSCORE` to the executable (for example
   `C:\Program Files\MuseScore 4\bin\MuseScore4.exe`).
2. **ffmpeg** (includes ffprobe) on PATH: `winget install Gyan.FFmpeg`.
3. **A Cache Rule for `/music/`**, set up like the gallery one in
   [Caching](#caching) above. The dashboard uploader doesn't set
   `cache-control`, and every file under `music/` is safe to cache for a year
   (see [Why the folder has a hash in it](#why-the-folder-has-a-hash-in-it)).
   Music goes in the same bucket as the videos and gallery.

## Before exporting a piece

Add the copyright notice **in the score itself**: File > Score Properties >
Copyright, e.g. `© 2025 Kyle Hagerman. All rights reserved.` It's then
engraved into the footer of every SVG page and the PDF. A notice overlaid by
the website can be deleted in devtools; one drawn into the page can't.

Also check the title and composer fields while you're there. They print on
page 1, which is what the share card shows.

## Adding or updating a piece

1. Save the score as `music-src/{slug}.mscz`. The slug is the URL
   (`/music/{slug}`), so use lowercase words joined by hyphens.

   > can use the following command to convert file names from my naming convention to slugs

   ```bash
   for f in *.mscz; do
    n=$(echo "${f%.mscz}" | tr '[:upper:]' '[:lower:]' | sed -E 's/[._ ]+/-/g; s/-+/-/g; s/^-|-$//g')
    [ "$f" != "$n.mscz" ] && mv -- "$f" "$f.tmp" && mv -- "$f.tmp" "$n.mscz"
   done
   ```

   > This finds the dates from each score

   ```bash
   for f in *.mscz; do
    y=$(unzip -p "$f" '*.mscx' 2>/dev/null | grep -o '<metaTag name="copyright">[^<]*' | grep -oE '(19|20)[0-9]{2}' | head -1)
    echo "$f: ${y:-not found}"
    done
   ```

   > And this finds the instruments

   ```bash
    for f in *.mscz; do
    i=$(unzip -p "$f" '*.mscx' 2>/dev/null | grep -o '<trackName>[^<]*' | sed 's/<trackName>//' | awk '!seen[$0]++' | paste -sd',' | sed 's/,/, /g')
    echo "$f: ${i:-not found}"
    done
   ```

2. Add an entry with the same `slug` to `src/constant/music.ts` (title, year,
   instrumentation, writeup, ...). The script reads the title and year from
   there for the MP3 tags.
3. Run:

   ```bash
   pnpm music
   ```

   It exports every piece whose `.mscz` changed since the last run into
   `music-out/music/{slug}/{hash}/` and updates `src/data/music.json`.
   Unchanged pieces are skipped. To do only some pieces, run
   `pnpm music --only=slug-one,slug-two`.

4. **Check the audio** (next section).
5. **Upload** the folders the script lists at the end. The simplest way is
   to drag `music-out/music` into the bucket root in the Cloudflare dashboard,
   so objects land at `music/{slug}/{hash}/...`, which is exactly what the
   manifest points at. Re-uploading pieces that are already there is harmless.
6. Commit `src/data/music.json`. **Upload first**: the manifest points at
   those keys, so a deploy before the upload serves pages whose audio, score
   and share image all 404.

Until a piece has an entry in `music.json`, its page shows the writeup with
"The score and recording are on their way", and it's left out of the sitemap.

## Check the audio

Listen to every new `music-out/music/{slug}/{hash}/audio.mp3` before you
commit.

- **Is it Muse Sounds?** It hasn't been verified yet whether MuseScore 4's command-line
  export uses Muse Sounds or falls back to the basic soundfont.
  If the MP3 sounds noticeably worse than playback inside MuseScore, that's
  what happened. The fix is to export the WAV from the MuseScore app (File >
  Export) and give it to ffmpeg yourself; ask and the script can be changed to
  take a hand-exported WAV.
- **Loudness.** Every piece is normalised to the same loudness (-18 LUFS) with
  one gain change for the whole file, so dynamics are kept. If a piece can't
  reach that level without clipping, ffmpeg compresses it instead, and the
  script prints a warning naming the piece.

## Why the folder has a hash in it

Everything under `music/` is cached for a year as `immutable`. If a
re-exported file kept its old URL, browsers and Cloudflare would keep
serving the old one. So each export goes under the hash of its `.mscz`, and
changing the score changes the URL.

The hash only covers the score. If the **same** score should render
differently (you updated Muse Sounds, or changed a setting in the script), run
`pnpm music --force --only=slug` to get fresh keys. If you changed a
setting for every piece, bump `REV` instead.

Old folders stay in R2 after a re-export. They don't cost much, and you can
delete them from the dashboard whenever you like.

## What never gets published

`music-out/` only ever contains `.mp3`, `.svg`, `.png` and `.pdf`, so it's
safe to upload the whole folder. **Never** put `.mscz`,
MusicXML (`.mxl`/`.musicxml`) or MIDI files on R2 or in `public/`. Those are
the editable formats, and they would make it easy to take a score and pass it
off as someone else's. A PDF or SVG is a picture of the score, not the score
itself. `music-src/` and `music-out/` are gitignored.

No right-click blocking, `user-select: none`, overlays or PDF passwords either.
All of them can be bypassed in seconds, and they get in the way of screen
readers.

Legal note: copyright applies automatically when you write a piece.
Registering it (a legal step, not a technical one) is what unlocks statutory
damages if it's ever infringed.

## Checking an upload

The Cache Rule from setup handles caching. Nothing else needs setting: with no
`Content-Disposition` header, browsers open a PDF in their viewer instead of
downloading it, which is what the "Score PDF" link wants.

After the first upload, check that the dashboard set the right content types:

```bash
curl -I https://<your-domain>/music/<slug>/<hash>/page-01.svg   # image/svg+xml
curl -I https://<your-domain>/music/<slug>/<hash>/audio.mp3     # audio/mpeg
curl -I https://<your-domain>/music/<slug>/<hash>/score.pdf     # application/pdf
```

An SVG served as anything other than `image/svg+xml` won't render in an
`<img>`.
