'use client';

import { Github } from 'lucide-react';

import { signInWithGitHub } from '@/lib/supabase/actions';
import { Button } from '@/components/ui/Button';

export function GitHubSignInButton() {
  return (
    <Button
      variant='outline'
      className='w-fit gap-2'
      onClick={() => signInWithGitHub()}
    >
      <Github className='size-4' />
      Continue with GitHub
    </Button>
  );
}
