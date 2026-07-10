'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { unlockPost, type UnlockResult } from '@/lib/blog/actions';

async function submitUnlock(
  _prevState: UnlockResult | undefined,
  formData: FormData,
): Promise<UnlockResult> {
  const slug = String(formData.get('slug') ?? '');
  const password = String(formData.get('password') ?? '');
  return unlockPost(slug, password);
}

export function PostPasswordForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    UnlockResult | undefined,
    FormData
  >(submitUnlock, undefined);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className='flex max-w-sm flex-col gap-3'>
      <input type='hidden' name='slug' value={slug} />

      <label htmlFor='blog-password' className='text-muted-foreground text-sm'>
        This post is password protected.
      </label>

      <input
        id='blog-password'
        name='password'
        type='password'
        required
        autoFocus
        autoComplete='off'
        className='border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-hidden'
      />

      <Button type='submit' disabled={pending} className='w-fit'>
        {pending ? 'Checking…' : 'Unlock'}
      </Button>

      {state?.message && !state.success && (
        <p role='alert' className='text-destructive text-sm'>
          {state.message}
        </p>
      )}
    </form>
  );
}
