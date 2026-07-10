'use client';

import { Button } from '@/components/ui/Button';
import { signInWithGitHub } from '@/lib/supabase/actions';

import GitHubIcon from '../icons/GithubIcon';

export function GitHubSignInButton() {
  return (
    <Button
      variant='outline'
      className='w-fit gap-2'
      onClick={() => signInWithGitHub()}
    >
      <GitHubIcon className='size-4' />
      Continue with GitHub
    </Button>
  );
}
