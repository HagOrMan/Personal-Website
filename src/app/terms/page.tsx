import Link from 'next/link';

import { PageHeader } from '@/components/layout/PageHeader';
import {
  LegalProse,
  LegalSection,
  LegalUpdated,
} from '@/components/legal/LegalProse';

// Hardcoded on purpose - see the note in app/privacy/page.tsx. The © year
// just above is dynamic; this one must not be.
const LAST_UPDATED = '23 September 2026';

function ContactLink({ children }: { children: string }) {
  return (
    <Link
      href='/contact'
      className='text-foreground hover:text-primary underline underline-offset-2'
    >
      {children}
    </Link>
  );
}

export default function Terms() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='Terms'
        description='Who owns what here, what you are welcome to do with it, and what this site does not promise.'
      />

      <LegalProse>
        <p className='text-muted-foreground leading-relaxed'>
          Short version: the writing and photographs are mine, you are welcome
          to quote and share them with credit, and the site comes with no
          guarantees.
        </p>

        <LegalSection heading='The writing'>
          <p>
            © {new Date().getFullYear()} Kyle Hagerman. All rights reserved.
          </p>
          <p>
            You are welcome to quote from my posts, and to share, link or cite
            them anywhere you like. All I ask is attribution and a link back to
            the original. That is not a formality — the link is how whoever
            reads your quote finds the rest of the piece.
          </p>
          <p>
            What needs asking first is reproducing a post in full, republishing
            it elsewhere, or presenting it as your own work. If you want to do
            something that goes past a quote, <ContactLink>ask me</ContactLink>
            . The answer is usually yes.
          </p>
        </LegalSection>

        <LegalSection heading='The photographs'>
          <p>
            The photographs in the gallery and throughout the site are mine and
            are covered by the same terms as the writing: share them with
            credit, and ask before reproducing or editing them.
          </p>
        </LegalSection>

        <LegalSection heading='The code'>
          <p>
            Projects linked from this site live in their own repositories, each
            under whatever licence that repository states. This page covers the
            written content and images on the site — it does not override a
            licence file somewhere else.
          </p>
        </LegalSection>

        <LegalSection heading='Using the site'>
          <p>
            Reading, linking and sharing: go ahead, that is what it is for. The
            two things I would ask you not to do are automated bulk collection
            of the content, and trying to reach password-protected posts you
            have not been given the password to.
          </p>
        </LegalSection>

        <LegalSection heading='No guarantees'>
          <p>
            This is a personal site maintained in my spare time and provided
            as-is. I make no promise that it will be available, that everything
            on it is accurate or current, or that anything written here is
            advice you should act on. Views expressed are my own and are not
            those of any employer, present or past.
          </p>
        </LegalSection>

        <LegalSection heading='Links to other sites'>
          <p>
            Links out are not endorsements. I have no control over what those
            sites contain or what they do with your data once you are there.
          </p>
        </LegalSection>

        <LegalSection heading='Changes'>
          <p>
            These terms may change; the date below tells you when they last
            did. How this site handles data is covered separately in the{' '}
            <Link
              href='/privacy'
              className='text-foreground hover:text-primary underline underline-offset-2'
            >
              privacy policy
            </Link>
            .
          </p>
        </LegalSection>

        <LegalUpdated date={LAST_UPDATED} />
      </LegalProse>
    </main>
  );
}
