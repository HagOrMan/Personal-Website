'use client';

import * as React from 'react';

import { ChevronDown, Search } from 'lucide-react';

import { PopoverPanel } from '@/components/ui/Popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/Sheet';
import { useMediaQuery } from '@/lib/screenUtils';
import { cn } from '@/lib/utils';
import type { ProjectTool } from '@/types/projects/ProjectShowcase';

type ProjectToolsFilterProps = {
  /** Every tool in use, already deduplicated and sorted. */
  tools: ProjectTool[];
  selected: ProjectTool[];
  onToggle: (tool: ProjectTool) => void;
  /** Projects that would match if this tool were added to the selection. */
  countFor: (tool: ProjectTool) => number;
};

/**
 * The Tools filter. A popover on pointer devices, a bottom sheet on phones —
 * a search field over a scrolling checkbox list is cramped in a popover the
 * width of a thumb.
 */
export function ProjectToolsFilter({
  tools,
  selected,
  onToggle,
  countFor,
}: ProjectToolsFilterProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const isPhone = useMediaQuery('(max-width: 639px)');

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  // "(all)" rather than an empty label: the point is to say this filter is
  // currently narrowing nothing.
  const label =
    selected.length === 0
      ? 'Tools (all)'
      : selected.length === 1
        ? `Tools: ${selected[0]}`
        : `Tools (${selected.length})`;

  const list = (
    <ToolsList
      tools={tools}
      selected={selected}
      onToggle={onToggle}
      countFor={countFor}
      query={query}
      onQueryChange={setQuery}
      autoFocus={open}
    />
  );

  return (
    <div className='relative'>
      <button
        ref={triggerRef}
        type='button'
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup='dialog'
        className={cn(
          'border-border/60 bg-background/60 focus-visible:ring-ring inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors',
          'hover:border-border hover:bg-accent/40 focus-visible:ring-2 focus-visible:outline-hidden',
          selected.length > 0 && 'border-foreground/30 bg-accent/60',
        )}
      >
        {label}
        <ChevronDown
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {isPhone ? (
        <Sheet
          open={open}
          onOpenChange={(next) => (next ? setOpen(true) : close())}
        >
          <SheetContent
            side='bottom'
            className='max-h-[80svh] rounded-t-xl'
            // Radix would focus the panel itself; the list focuses the search
            // field a frame later, which is where typing should land.
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <SheetHeader className='pb-0'>
              <SheetTitle>Filter by tool</SheetTitle>
              <SheetDescription>
                Projects must use every tool you pick.
              </SheetDescription>
            </SheetHeader>
            <div className='px-4 pb-6'>{list}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <PopoverPanel
          open={open}
          onClose={close}
          triggerRef={triggerRef}
          align='start'
          aria-label='Filter by tool'
          className='w-72 p-3'
        >
          {list}
        </PopoverPanel>
      )}
    </div>
  );
}

type ToolsListProps = {
  tools: ProjectTool[];
  selected: ProjectTool[];
  onToggle: (tool: ProjectTool) => void;
  countFor: (tool: ProjectTool) => number;
  query: string;
  onQueryChange: (value: string) => void;
  autoFocus: boolean;
};

function ToolsList({
  tools,
  selected,
  onToggle,
  countFor,
  query,
  onQueryChange,
  autoFocus,
}: ToolsListProps) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!autoFocus) return;
    // A frame late so the panel is laid out before focus moves into it.
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? tools.filter((tool) => tool.toLowerCase().includes(needle))
    : tools;

  const rows = () =>
    Array.from(
      listRef.current?.querySelectorAll<HTMLInputElement>(
        'input[type=checkbox]:not(:disabled)',
      ) ?? [],
    );

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const all = rows();
    const current = all.indexOf(document.activeElement as HTMLInputElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      all[Math.min(current + 1, all.length - 1)]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (current <= 0) searchRef.current?.focus();
      else all[current - 1]?.focus();
      return;
    }

    // Typing anywhere in the list belongs in the search field. No
    // preventDefault - focus moves first, so the character still lands.
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      searchRef.current?.focus();
    }
  };

  return (
    <div className='flex flex-col gap-2'>
      <div className='relative'>
        <Search
          className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2'
          aria-hidden
        />
        <input
          ref={searchRef}
          type='search'
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown') return;
            event.preventDefault();
            rows()[0]?.focus();
          }}
          placeholder='Search tools'
          aria-label='Search tools'
          className='border-border/60 bg-background/60 focus-visible:ring-ring w-full rounded-md border py-1.5 pr-2 pl-8 text-xs focus-visible:ring-2 focus-visible:outline-hidden'
        />
      </div>

      <div
        ref={listRef}
        onKeyDown={handleListKeyDown}
        className='scrollbar-hover flex max-h-64 flex-col overflow-y-auto'
      >
        {visible.length === 0 ? (
          <p className='text-muted-foreground px-1 py-3 text-xs'>
            No tools match “{query}”.
          </p>
        ) : (
          visible.map((tool) => {
            const isSelected = selected.includes(tool);
            const count = countFor(tool);
            // A selected tool always stays clickable, even at zero — it's the
            // only way back out of a combination that matches nothing.
            const disabled = count === 0 && !isSelected;

            return (
              <label
                key={tool}
                className={cn(
                  'hover:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                  'has-[:focus-visible]:bg-accent/60',
                  disabled &&
                    'text-muted-foreground/50 pointer-events-none opacity-60',
                )}
              >
                <input
                  type='checkbox'
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => onToggle(tool)}
                  className='accent-lush-500 size-3.5 cursor-pointer'
                />
                <span className='flex-1'>{tool}</span>
                <span className='text-muted-foreground tabular-nums'>
                  ({count})
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
