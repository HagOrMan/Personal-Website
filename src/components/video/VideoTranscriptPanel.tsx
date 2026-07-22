'use client';

import { Collapsible, CollapsibleContent } from '@/components/ui/Collapsible';

type VideoTranscriptPanelProps = {
  open: boolean;
  transcript: string;
  videoTitle: string;
  panelId: string;
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
          className='scrollbar-hover text-foreground/80 max-h-48 overflow-y-auto rounded-lg bg-black/5 p-4 text-sm leading-relaxed break-words whitespace-pre-line dark:bg-white/5'
        >
          {transcript}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
