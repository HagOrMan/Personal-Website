'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import {
  type ContactFormResult,
  submitContactForm,
} from '@/lib/contact/actions';
import { cn } from '@/lib/utils';

const fieldClass =
  'border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-hidden';

export function ContactForm() {
  const [state, formAction, pending] = useActionState<
    ContactFormResult | undefined,
    FormData
  >(submitContactForm, undefined);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sendCopy, setSendCopy] = useState(false);
  const sendCopyRef = useRef<HTMLInputElement>(null);

  // React resets uncontrolled fields after any action submission, including
  // validation failures (the action returns rather than throwing), so the
  // fields are controlled and only cleared once the submission succeeds.
  useEffect(() => {
    const shouldClear = state?.success;
    if (shouldClear) {
      setName('');
      setEmail('');
      setMessage('');
      setSendCopy(false);
    }

    // That same auto-reset calls the native form.reset(), which reverts the
    // checkbox to unchecked no matter what - React only keeps a controlled
    // checkbox's `checked` DOM property in sync, never its `defaultChecked`,
    // so the native reset always wins for it (unlike text inputs, whose
    // defaultValue React does keep in sync). Restore it by hand.
    if (sendCopyRef.current) {
      sendCopyRef.current.checked = shouldClear ? false : sendCopy;
    }
  }, [state]);

  return (
    <LiquidGlassCard
      className='mx-auto w-full max-w-xl'
      contentClassName='p-6 md:p-10'
    >
      <form action={formAction} className='flex flex-col gap-5'>
        <div className='flex flex-col gap-1.5'>
          <label htmlFor='contact-name' className='text-muted-foreground text-sm'>
            Name
          </label>
          <input
            id='contact-name'
            name='name'
            type='text'
            required
            autoComplete='name'
            placeholder='Jane Doe'
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {state?.fieldErrors?.name && (
            <p className='text-destructive text-xs'>{state.fieldErrors.name}</p>
          )}
        </div>

        <div className='flex flex-col gap-1.5'>
          <label
            htmlFor='contact-email'
            className='text-muted-foreground text-sm'
          >
            Email
          </label>
          <input
            id='contact-email'
            name='email'
            type='email'
            required
            autoComplete='email'
            placeholder='you@example.com'
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {state?.fieldErrors?.email && (
            <p className='text-destructive text-xs'>{state.fieldErrors.email}</p>
          )}
        </div>

        <div className='flex flex-col gap-1.5'>
          <label
            htmlFor='contact-message'
            className='text-muted-foreground text-sm'
          >
            What can I help with?
          </label>
          <textarea
            id='contact-message'
            name='message'
            required
            rows={6}
            placeholder="Tell me a bit about what you'd like to chat about..."
            className={cn(fieldClass, 'resize-y')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {state?.fieldErrors?.message && (
            <p className='text-destructive text-xs'>
              {state.fieldErrors.message}
            </p>
          )}
        </div>

        <label className='text-muted-foreground flex items-center gap-2 text-sm'>
          <input
            ref={sendCopyRef}
            type='checkbox'
            name='sendCopy'
            className='border-input accent-primary size-4 rounded'
            checked={sendCopy}
            onChange={(e) => setSendCopy(e.target.checked)}
          />
          Send me a copy of my request
        </label>

        <div className='flex flex-wrap items-center gap-4'>
          <Button type='submit' disabled={pending} className='w-fit'>
            {pending ? 'Sending…' : 'Send message'}
          </Button>

          {state?.message && (
            <p
              role='status'
              className={cn(
                'text-sm',
                state.success ? 'text-muted-foreground' : 'text-destructive',
              )}
            >
              {state.message}
            </p>
          )}
        </div>
      </form>
    </LiquidGlassCard>
  );
}
