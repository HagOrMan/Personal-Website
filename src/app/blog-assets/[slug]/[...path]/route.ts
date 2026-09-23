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

  // Assets are resolved from the source that owns the post, so a slug can
  // never reach into a different repo. Sources with no assets directory
  // (their files link straight to GitHub) return null here, i.e. 404.
  const asset = await getAsset(post.source, slug, segments);
  if (!asset) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(asset.bytes), {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      // s-maxage is deliberately absent from the locked branch. A shared-cache
      // directive there would put a password-protected asset in Vercel's CDN,
      // where every later request is served without ever reaching the
      // hasAccess() check above. `private` is what keeps that check load-
      // bearing, so don't unify these two strings.
      //
      // Public assets get s-maxage so a burst collapses to one origin fetch
      // instead of one function invocation per request. 300s matches the
      // content Data Cache, so an edited image goes stale on the same clock
      // as the post that embeds it.
      'Cache-Control': post.meta.locked
        ? 'private, max-age=300'
        : 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
