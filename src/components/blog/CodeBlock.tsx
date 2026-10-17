'use client';

import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { actionVariants } from '@/components/ui/actionVariants';
import { cn } from '@/lib/utils';

const COPIED_MS = 2000;

/**
 * A post's <pre> with a copy button pinned to its top-right corner. The button
 * sits on a wrapper rather than inside the <pre>, so it stays put while a long
 * line scrolls sideways underneath it.
 */
export function CodeBlock({ className, children, ...props }: ComponentProps<'pre'>) {
  const preRef = useRef<HTMLPreElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function copy() {
    // Read from the DOM rather than from props: by the time the block reaches
    // here it's a tree of highlighter spans, and textContent flattens it back
    // to exactly what the reader sees. Markdown leaves a trailing newline on
    // every fenced block, which nobody wants pasted into a terminal.
    const text = preRef.current?.textContent?.replace(/\n$/, '') ?? '';

    // navigator.clipboard is undefined outside a secure context (e.g. the dev
    // server opened by LAN IP), and writeText rejects without permission.
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }

    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  const Icon = copied ? Check : Copy;

  return (
    <div className='relative'>
      <pre ref={preRef} className={className} {...props}>
        {children}
      </pre>
      <button
        type='button'
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className={cn(
          actionVariants({ variant: 'outline', size: 'icon' }),
          'bg-background/80 absolute top-2 right-2 cursor-pointer backdrop-blur-sm',
        )}
      >
        <Icon className='size-4' aria-hidden />
      </button>
      <span className='sr-only' aria-live='polite'>
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </div>
  );
}
