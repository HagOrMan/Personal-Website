'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { ChevronDown, Lock, Star } from 'lucide-react';

import { Chip } from '@/components/ui/Chip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/Collapsible';
import { Separator } from '@/components/ui/Separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
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

function PostListItem({
  post,
  forceBorder = false,
}: {
  post: PostMeta;
  forceBorder?: boolean;
}) {
  return (
    <li
      className={cn(
        'border-border border-b pb-6',
        !forceBorder && 'last:border-none',
      )}
    >
      <Link href={`/blog/${post.slug}`} className='group flex flex-col gap-1'>
        <span className='text-foreground group-hover:text-primary flex items-center gap-2 text-xl font-semibold'>
          {post.featured && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Star
                  className='text-nebula-500 dark:text-nebula-400 size-4 shrink-0 fill-current'
                  aria-label='Featured'
                />
              </TooltipTrigger>
              <TooltipContent>Featured</TooltipContent>
            </Tooltip>
          )}
          {post.locked && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock
                  className='size-4 shrink-0'
                  aria-label='Password protected'
                />
              </TooltipTrigger>
              <TooltipContent>Locked</TooltipContent>
            </Tooltip>
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
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>('newest');
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  // Tag links in article headers point at /blog?tag=x, so the filter
  // starts from the URL and stays in it (shareable, survives refresh).
  const [selectedTag, setSelectedTag] = useState<string | null>(() =>
    searchParams.get('tag'),
  );

  function selectTag(tag: string | null) {
    setSelectedTag(tag);
    window.history.replaceState(
      null,
      '',
      tag ? `/blog?tag=${encodeURIComponent(tag)}` : '/blog',
    );
  }

  const tags = [...new Set(posts.flatMap((post) => post.tags ?? []))].sort(
    (a, b) => a.localeCompare(b),
  );
  const hasFolders = posts.some((post) => post.folder);

  const visible = selectedTag
    ? posts.filter((post) => post.tags?.includes(selectedTag))
    : posts;

  const hasFeaturedPosts = posts.some((post) => post.featured);
  const featured = visible.filter((post) => post.featured);
  const featuredTopPosts = featured.filter((post) => post.featuredTop);
  const featuredRestPosts = featured.filter((post) => !post.featuredTop);
  // "top" is opt-in - if nothing's been tiered, or everything featured
  // happens to be top, there's nothing to hide behind an expander.
  const hasFeaturedTiering =
    featuredTopPosts.length > 0 && featuredRestPosts.length > 0;
  // A tag filter narrows the pool enough that hiding anything behind
  // "view all" would just be confusing, so it forces everything open.
  const featuredExpanded = showAllFeatured || selectedTag !== null;
  const featuredLead = hasFeaturedTiering ? featuredTopPosts : featured;
  const featuredHidden = hasFeaturedTiering ? featuredRestPosts : [];

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
      {tags.length > 0 && (
        <div className='flex flex-wrap items-center gap-2'>
          <TagChip
            label='All'
            active={selectedTag === null}
            onClick={() => selectTag(null)}
          />
          {tags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              active={selectedTag === tag}
              onClick={() => selectTag(selectedTag === tag ? null : tag)}
            />
          ))}
        </div>
      )}

      {hasFeaturedPosts && (
        <>
          <section className='flex flex-col gap-4'>
            <h2 className='text-foreground text-lg font-semibold tracking-tight'>
              Featured
            </h2>
            {featured.length > 0 ? (
              <>
                <ul className='flex flex-col gap-6'>
                  {featuredLead.map((post, index) => (
                    <PostListItem
                      key={post.slug}
                      post={post}
                      forceBorder={
                        featuredHidden.length > 0 &&
                        index === featuredLead.length - 1
                      }
                    />
                  ))}
                </ul>

                {featuredHidden.length > 0 && (
                  <Collapsible
                    open={featuredExpanded}
                    onOpenChange={setShowAllFeatured}
                    className='flex flex-col gap-4'
                  >
                    <CollapsibleContent className='data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden'>
                      <ul className='flex flex-col gap-6'>
                        {featuredHidden.map((post) => (
                          <PostListItem key={post.slug} post={post} />
                        ))}
                      </ul>
                    </CollapsibleContent>

                    {!selectedTag && (
                      <CollapsibleTrigger className='group hover:text-primary text-muted-foreground flex cursor-pointer items-center gap-1.5 text-sm transition-colors'>
                        <ChevronDown className='size-4 shrink-0 transition-transform duration-200 group-data-[state=closed]:-rotate-90' />
                        {featuredExpanded
                          ? 'Show fewer'
                          : `View all featured (+${featuredHidden.length})`}
                      </CollapsibleTrigger>
                    )}
                  </Collapsible>
                )}
              </>
            ) : (
              <p className='text-muted-foreground text-sm'>
                No featured posts match this filter.
              </p>
            )}
          </section>

          <Separator className='h-1!' />
        </>
      )}

      {(hasFeaturedPosts || hasFolders) && (
        <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-3'>
          {hasFeaturedPosts ? (
            <h2 className='text-foreground text-lg font-semibold tracking-tight'>
              All Blogs
            </h2>
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
            <Collapsible key={folder} defaultOpen asChild>
              <section>
                <h2 className='text-foreground text-lg font-semibold tracking-tight'>
                  <CollapsibleTrigger className='group hover:text-primary flex cursor-pointer items-center gap-2 transition-colors'>
                    <ChevronDown className='size-4 shrink-0 transition-transform duration-200 group-data-[state=closed]:-rotate-90' />
                    {folder}
                    <span className='text-muted-foreground/70 text-sm font-normal'>
                      {folderPosts.length}
                    </span>
                  </CollapsibleTrigger>
                </h2>
                <CollapsibleContent className='data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden'>
                  <ul className='flex flex-col gap-6 pt-4'>
                    {folderPosts.map((post) => (
                      <PostListItem key={post.slug} post={post} />
                    ))}
                  </ul>
                </CollapsibleContent>
              </section>
            </Collapsible>
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
    <Chip asChild variant={active ? 'active' : 'default'}>
      <button type='button' aria-pressed={active} onClick={onClick}>
        {label}
      </button>
    </Chip>
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
