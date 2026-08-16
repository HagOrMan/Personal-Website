import { getPost } from '@/lib/blog/github';
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';

export const alt = "Kyle's Corner — Blog Post";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  // This route is publicly reachable and does not go through the unlock
  // cookie check — locked or missing posts must never leak their title.
  if (!post || post.meta.locked) {
    return renderOgImage({ eyebrow: 'Blog', title: "Kyle's Corner" });
  }

  return renderOgImage({
    eyebrow: post.meta.date ? formatDate(post.meta.date) : 'Blog',
    title: post.meta.title,
    subtitle: post.meta.description ?? post.meta.excerpt,
  });
}
