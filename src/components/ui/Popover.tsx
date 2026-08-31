'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type PopoverPanelProps = {
  open: boolean;
  onClose: () => void;
  /**
   * The button that opens the panel. Clicks on it aren't "outside" (it does
   * its own toggling), and Escape hands focus back to it.
   */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** Which edge the panel lines up with. The parent must be `relative`. */
  align?: 'start' | 'end';
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<'div'>, 'children' | 'className'>;

/**
 * A small anchored panel: the filter bar's ⓘ descriptions and its Tools list
 * are the same component, so tap, click and keyboard all land in one place.
 *
 * Hand-rolled rather than pulled from Radix because the Tools list needs to
 * own its own arrow-key/typeahead behaviour, which a menu primitive would
 * fight — and because a popover this simple isn't worth a dependency.
 * Positioning is plain CSS, so the element that renders it must be
 * `position: relative` and must not clip overflow.
 */
export function PopoverPanel({
  open,
  onClose,
  triggerRef,
  align = 'start',
  className,
  children,
  ...props
}: PopoverPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      // Closes, but deliberately doesn't pull focus back to the trigger —
      // you clicked somewhere for a reason.
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
      triggerRef.current?.focus();
    };

    // Tabbing past the last row should close it the same way clicking away does.
    const handleFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (!next) return; // focus left the window entirely — leave it open
      if (panelRef.current?.contains(next)) return;
      if (triggerRef.current?.contains(next)) return;
      onClose();
    };

    const panel = panelRef.current;
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    panel?.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      panel?.removeEventListener('focusout', handleFocusOut);
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role='dialog'
      className={cn(
        'border-border/60 bg-popover/95 animate-in fade-in-0 zoom-in-95 absolute top-[calc(100%+0.5rem)] z-50',
        'rounded-xl border shadow-lg backdrop-blur-xl',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
