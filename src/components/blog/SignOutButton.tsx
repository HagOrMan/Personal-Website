'use client';

import { Button } from '@/components/ui/Button';
import { signOut } from '@/lib/supabase/actions';

export function SignOutButton() {
  return (
    <Button variant='outline' className='w-fit' onClick={() => signOut()}>
      Sign out
    </Button>
  );
}
