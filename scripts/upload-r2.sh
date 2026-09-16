#!/usr/bin/env bash
# Upload processed photos to Cloudflare R2.
#
#   R2_ACCOUNT_ID=... R2_BUCKET=... \
#   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
#   ./scripts/upload-r2.sh ./photos-out
#
# Filenames contain a content hash, so anything already uploaded is byte
# identical and can be cached forever. Changing a photo changes its hash and
# therefore its URL, which means you never need to purge the CDN.

set -euo pipefail

OUT_DIR="${1:-./photos-out}"
PREFIX="${R2_PREFIX:-gallery}"

: "${R2_ACCOUNT_ID:?set R2_ACCOUNT_ID}"
: "${R2_BUCKET:?set R2_BUCKET}"
: "${AWS_ACCESS_KEY_ID:?set AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?set AWS_SECRET_ACCESS_KEY}"

ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# R2 rejects the extra integrity headers that aws-cli v2.23+ sends by default.
# Without these two vars you get an opaque 400 on every PUT.
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
export AWS_DEFAULT_REGION=auto

sync_format() {
  local ext="$1" mime="$2"
  echo "  *.${ext}"
  aws s3 sync "${OUT_DIR}/${PREFIX}" "s3://${R2_BUCKET}/${PREFIX}" \
    --endpoint-url "$ENDPOINT" \
    --exclude "*" --include "*.${ext}" \
    --content-type "$mime" \
    --cache-control "public, max-age=31536000, immutable" \
    --size-only \
    --no-progress
}

echo "Uploading images to s3://${R2_BUCKET}/${PREFIX}"
sync_format avif image/avif
sync_format webp image/webp
sync_format jpg  image/jpeg

# photos.json is deliberately not uploaded: the wall imports it at build time
# from src/data/photos.json, so a copy on R2 would only be a second source of
# truth that silently goes stale.
echo
echo "Done. Serve these through an R2 custom domain, not the r2.dev URL:"
echo "  Cloudflare dashboard > R2 > ${R2_BUCKET} > Settings > Custom Domains"
echo "The r2.dev endpoint is rate limited and unsuitable for production traffic."
