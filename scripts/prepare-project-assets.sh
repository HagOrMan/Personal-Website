#!/usr/bin/env bash
#
# Rewrites PROJECT_MEDIA in src/constant/projectAssets.ts from the .webp
# posters in public/projects/.
#
#   bash scripts/prepare-project-assets.sh
#
# A poster's filename is also the R2 key its loop is served from, so it has to
# match a directory under src/app/projects. That's the one thing worth
# stopping for; everything else here is just a listing.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POSTER_DIR="$ROOT/public/projects"
MANIFEST="$ROOT/src/constant/projectAssets.ts"
ROUTES_DIR="$ROOT/src/app/projects"

ROUTES="$(find "$ROUTES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n')"

slugs=''
problems=0

for file in "$POSTER_DIR"/*.webp; do
  [ -e "$file" ] || continue
  slug="$(basename "$file" .webp)"

  if ! printf '%s\n' "$ROUTES" | grep -qx "$slug"; then
    echo "  ✗ $slug.webp — no src/app/projects/$slug/. Rename it." >&2
    problems=$((problems + 1))
    continue
  fi

  slugs="$slugs  '$slug',"$'\n'
  echo "  ✓ $slug"
done

if [ "$problems" -gt 0 ]; then
  echo "Nothing written." >&2
  exit 1
fi

# Replaces only the lines between the declaration and its closing `];`, so the
# comment above it survives.
tmp="$(mktemp)"
awk -v list="${slugs%$'\n'}" '
  /^export const PROJECT_MEDIA/ {
    print
    if (list != "") print list
    skip = 1
    next
  }
  skip && /^\];/ { skip = 0; print; next }
  skip { next }
  { print }
' "$MANIFEST" > "$tmp"
mv "$tmp" "$MANIFEST"

echo "PROJECT_MEDIA synced."
