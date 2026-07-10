'use client';

import { useActionState } from 'react';

import {
  signInWithMagicLink,
  type MagicLinkResult,
} from '@/lib/supabase/actions';
import { Button } from '@/components/ui/Button';

export function LoginForm() {
  const [state, formAction, pending] = useActionState<
    MagicLinkResult | undefined,
    FormData
  >(signInWithMagicLink, undefined);

  return (
    <form action={formAction} className='flex flex-col gap-3'>
      <label htmlFor='login-email' className='text-muted-foreground text-sm'>
        Sign in with a magic link
      </label>

      <input
        id='login-email'
        name='email'
        type='email'
        required
        autoComplete='email'
        placeholder='you@example.com'
        className='border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-hidden'
      />

      <Button type='submit' disabled={pending} className='w-fit'>
        {pending ? 'Sending…' : 'Send magic link'}
      </Button>

      {state?.message && (
        <p
          role='status'
          className={
            state.success
              ? 'text-muted-foreground text-sm'
              : 'text-destructive text-sm'
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
