'use client';

import { Collapsible, CollapsibleContent } from '@/components/ui/Collapsible';
import { cn } from '@/lib/utils';

type VideoTranscriptPanelProps = {
  open: boolean;
  transcript: string;
  videoTitle: string;
  panelId: string;
  /** Caps the panel at a fixed height with its own internal scroll - the
   * default, for contexts (mobile modal, sticky panel) with no other
   * scroll region to fall back on. The desktop modal already scrolls its
   * whole content column, so it opts out to avoid a scroll-within-a-scroll. */
  scrollable?: boolean;
};

/**
 * The disclosure trigger lives in VideoControlBar (the transcript icon
 * button) and drives `open` directly - this just renders the Radix
 * Collapsible Root + Content, which works fully controlled without its
 * own Trigger subcomponent.
 */
export function VideoTranscriptPanel({
  open,
  transcript,
  videoTitle,
  panelId,
  scrollable = true,
}: VideoTranscriptPanelProps) {
  return (
    <Collapsible open={open}>
      <CollapsibleContent
        id={panelId}
        className='data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden'
      >
        <div
          role='region'
          aria-label={`Transcript for ${videoTitle}`}
          className={cn(
            'text-foreground/80 rounded-lg bg-black/5 p-4 text-sm leading-relaxed break-words whitespace-pre-line dark:bg-white/5',
            scrollable && 'scrollbar-hover max-h-48 overflow-y-auto',
          )}
        >
          {transcript}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
