import type { Metadata } from 'next';

import { GitHubSignInButton } from '@/components/blog/GitHubSignInButton';
import { LoginForm } from '@/components/blog/LoginForm';
import { SignOutButton } from '@/components/blog/SignOutButton';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Login',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No owners configured yet - sign-in itself never depends on this, it
  // only gates the locked-post bypass in lib/blog/auth.ts. Surfacing the
  // ID here is how you bootstrap that list in the first place.
  const hasOwnersConfigured = Boolean(process.env.BLOG_OWNER_USER_IDS?.trim());

  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto flex w-full max-w-sm flex-col gap-6'>
        <h1 className='text-foreground text-3xl font-bold tracking-tight'>
          {user ? 'Signed in' : 'Sign in'}
        </h1>

        {user ? (
          <div className='flex flex-col gap-4'>
            <p className='text-muted-foreground text-sm'>
              Signed in as {user.email ?? user.id}
            </p>

            <div className='flex flex-col gap-1'>
              <span className='text-muted-foreground text-xs'>Your user ID</span>
              <code className='border-border bg-muted text-foreground rounded-md border px-3 py-2 text-xs break-all select-all'>
                {user.id}
              </code>
            </div>

            {!hasOwnersConfigured && (
              <p className='text-muted-foreground text-sm'>
                No <code className='text-foreground'>BLOG_OWNER_USER_IDS</code>{' '}
                configured yet — copy the ID above into that environment variable
                to unlock owner access to locked posts.
              </p>
            )}

            <SignOutButton />
          </div>
        ) : (
          <div className='flex flex-col gap-6'>
            <GitHubSignInButton />

            <div className='flex items-center gap-3'>
              <span className='bg-border h-px flex-1' />
              <span className='text-muted-foreground text-xs'>or</span>
              <span className='bg-border h-px flex-1' />
            </div>

            <LoginForm />
          </div>
        )}
      </div>
    </main>
  );
}
