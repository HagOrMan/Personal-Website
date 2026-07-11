'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Lock } from 'lucide-react';

import type { PostMeta } from '@/lib/blog/github';
import { cn } from '@/lib/utils';

type View = 'newest' | 'folders';

const UNGROUPED_LABEL = 'General';

function formatDate(value: string | Date): string {
  // timeZone 'UTC' keeps the displayed day matching what was authored.
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function PostListItem({ post }: { post: PostMeta }) {
  return (
    <li className='border-border border-b pb-6 last:border-none'>
      <Link href={`/blog/${post.slug}`} className='group flex flex-col gap-1'>
        <span className='text-foreground group-hover:text-primary flex items-center gap-2 text-xl font-semibold'>
          {post.locked && (
            <Lock className='size-4 shrink-0' aria-label='Password protected' />
          )}
          {post.title}
        </span>

        {post.description && (
          <span className='text-muted-foreground text-sm'>
            {post.description}
          </span>
        )}
        {post.date && (
          <span className='text-muted-foreground/70 text-xs'>
            {formatDate(post.date)}
          </span>
        )}
      </Link>
    </li>
  );
}

export function BlogIndexClient({ posts }: { posts: PostMeta[] }) {
  const [view, setView] = useState<View>('newest');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tags = [...new Set(posts.flatMap((post) => post.tags ?? []))].sort(
    (a, b) => a.localeCompare(b),
  );
  const hasFolders = posts.some((post) => post.folder);

  const visible = selectedTag
    ? posts.filter((post) => post.tags?.includes(selectedTag))
    : posts;

  // Posts arrive pre-sorted (newest first), so groups keep that order
  // internally; the groups themselves sort alphabetically, ungrouped first.
  const groups = new Map<string, PostMeta[]>();
  if (view === 'folders') {
    for (const post of visible) {
      const key = post.folder ?? UNGROUPED_LABEL;
      groups.set(key, [...(groups.get(key) ?? []), post]);
    }
  }
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === UNGROUPED_LABEL) return -1;
    if (b === UNGROUPED_LABEL) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className='flex flex-col gap-6'>
      {(tags.length > 0 || hasFolders) && (
        <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-3'>
          {tags.length > 0 ? (
            <div className='flex flex-wrap items-center gap-2'>
              <TagChip
                label='All'
                active={selectedTag === null}
                onClick={() => setSelectedTag(null)}
              />
              {tags.map((tag) => (
                <TagChip
                  key={tag}
                  label={tag}
                  active={selectedTag === tag}
                  onClick={() =>
                    setSelectedTag((current) => (current === tag ? null : tag))
                  }
                />
              ))}
            </div>
          ) : (
            <span />
          )}

          {hasFolders && (
            <div className='border-border flex shrink-0 rounded-md border p-0.5'>
              <ViewButton
                label='Newest'
                active={view === 'newest'}
                onClick={() => setView('newest')}
              />
              <ViewButton
                label='By folder'
                active={view === 'folders'}
                onClick={() => setView('folders')}
              />
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className='text-muted-foreground'>No posts match this tag.</p>
      ) : view === 'newest' ? (
        <ul className='flex flex-col gap-6'>
          {visible.map((post) => (
            <PostListItem key={post.slug} post={post} />
          ))}
        </ul>
      ) : (
        <div className='flex flex-col gap-10'>
          {sortedGroups.map(([folder, folderPosts]) => (
            <section key={folder} className='flex flex-col gap-4'>
              <h2 className='text-foreground text-lg font-semibold tracking-tight'>
                {folder}
                <span className='text-muted-foreground/70 ml-2 text-sm font-normal'>
                  {folderPosts.length}
                </span>
              </h2>
              <ul className='flex flex-col gap-6'>
                {folderPosts.map((post) => (
                  <PostListItem key={post.slug} post={post} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-accent text-accent-foreground hover:bg-accent/70',
      )}
    >
      {label}
    </button>
  );
}

function ViewButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded px-2.5 py-1 text-xs transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}
