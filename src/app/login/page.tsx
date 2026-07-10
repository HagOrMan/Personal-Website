import type { Metadata } from 'next';

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

  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto flex w-full max-w-sm flex-col gap-6'>
        <h1 className='text-foreground text-3xl font-bold tracking-tight'>
          {user ? 'Signed in' : 'Sign in'}
        </h1>

        {user ? (
          <div className='flex flex-col gap-4'>
            <p className='text-muted-foreground text-sm'>
              Signed in as {user.email}
            </p>
            <SignOutButton />
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
