'use client';

import { signOut } from '@/lib/supabase/actions';
import { Button } from '@/components/ui/Button';

export function SignOutButton() {
  return (
    <Button variant='outline' className='w-fit' onClick={() => signOut()}>
      Sign out
    </Button>
  );
}
