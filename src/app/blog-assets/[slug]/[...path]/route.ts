import { NextResponse } from 'next/server';

import { hasAccess } from '@/lib/blog/auth';
import {
  getAsset,
  getPost,
  isValidAssetPath,
  isValidSlug,
} from '@/lib/blog/github';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; path: string[] }> },
) {
  const { slug, path: segments } = await params;

  // 404, never 401/403 - a locked post's assets shouldn't confirm existence.
  if (!isValidSlug(slug) || !isValidAssetPath(segments)) {
    return new NextResponse(null, { status: 404 });
  }

  const post = await getPost(slug);
  if (!post) return new NextResponse(null, { status: 404 });

  const canAccess = await hasAccess(slug, post.meta.locked);
  if (!canAccess) return new NextResponse(null, { status: 404 });

  const asset = await getAsset(slug, segments);
  if (!asset) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(asset.bytes), {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': post.meta.locked
        ? 'private, max-age=300'
        : 'public, max-age=300',
    },
  });
}
