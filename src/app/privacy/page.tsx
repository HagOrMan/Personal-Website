import Link from 'next/link';

import { PageHeader } from '@/components/layout/PageHeader';
import {
  LegalProse,
  LegalSection,
  LegalUpdated,
} from '@/components/legal/LegalProse';

// Hardcoded on purpose. Deriving this from the current date would make the
// page claim it was updated today every single day, which is worse than
// showing no date at all. Bump it by hand when the text below changes.
const LAST_UPDATED = '23 September 2026';

function Outbound({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='text-foreground hover:text-primary underline underline-offset-2'
    >
      {children}
    </a>
  );
}

export default function Privacy() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='Privacy'
        description='What this site collects, what it deliberately does not, and who else touches any of it.'
      />

      <LegalProse>
        <p className='text-muted-foreground leading-relaxed'>
          This is a personal site. It collects very little, and this page says
          plainly what that is. If anything below is unclear, or you want
          something removed,{' '}
          <Link
            href='/contact'
            className='text-foreground hover:text-primary underline underline-offset-2'
          >
            get in touch
          </Link>
          .
        </p>

        <LegalSection heading='Visitor analytics'>
          <p>
            Pages on this site are measured by Vercel Analytics and Vercel
            Speed Insights. Between them they record page views, the site that
            linked you here, an approximate country, your device and browser
            type, and how quickly pages loaded. Both are cookieless, and what I
            see is aggregate numbers rather than individual people.
          </p>
        </LegalSection>

        <LegalSection heading='Blog reading stats'>
          <p>
            I also keep my own count of which posts get read. For each view
            that means the post, the time, the country the request came from,
            the browser&rsquo;s user-agent string, and the{' '}
            <em>origin</em> of whatever linked you — the domain on its own,
            never the full address of the page you came from.
          </p>
          <p>
            What is <em>not</em> stored is anything that identifies you. Rather
            than recording your IP address, each view carries a one-way
            fingerprint: your IP address and user-agent string are combined
            with a secret value and the current UTC date, and that combination
            is run through SHA-256. What reaches the database is the resulting
            64-character digest, and nothing else.
          </p>
          <p>
            Two properties of that are worth spelling out. It is{' '}
            <strong className='text-foreground font-medium'>one-way</strong> —
            there is no calculation that turns the digest back into an IP
            address. And because the date is part of what gets hashed, the
            digest{' '}
            <strong className='text-foreground font-medium'>
              changes at midnight UTC every day
            </strong>
            . The practical effect is that I can see one person read four posts
            in an afternoon, which tells me something useful about what&rsquo;s
            worth writing more of. I cannot tell that the same person came back
            a week later — and neither could anyone who somehow got hold of the
            database.
          </p>
          <p>
            The user-agent string is kept as sent, because it is how automated
            crawlers get told apart from people actually reading.
          </p>
        </LegalSection>

        <LegalSection heading='The contact form'>
          <p>
            If you send me a message, I receive your name, email address and
            the message itself. It is delivered to my inbox and kept so that I
            have a record of the conversation. It is used to reply to you and
            for nothing else: no mailing list, no sharing, no selling.
          </p>
        </LegalSection>

        <LegalSection heading='Cookies and local storage'>
          <p>
            There are no advertising or tracking cookies here. If you unlock a
            password-protected post, one cookie remembers that so you are not
            retyping the password on every page; it expires on its own after a
            few hours. Your light or dark theme choice is saved in your
            browser&rsquo;s local storage and is never sent to me.
          </p>
        </LegalSection>

        <LegalSection heading='Who else handles any of this'>
          <p>
            The site runs on <Outbound href='https://vercel.com/legal/privacy-policy'>Vercel</Outbound>{' '}
            (hosting and analytics), stores data with{' '}
            <Outbound href='https://supabase.com/privacy'>Supabase</Outbound>,
            sends email through{' '}
            <Outbound href='https://resend.com/legal/privacy-policy'>Resend</Outbound>
            , and serves photographs and video from{' '}
            <Outbound href='https://www.cloudflare.com/privacypolicy/'>Cloudflare</Outbound>
            . Each has its own privacy policy, linked above. Your request
            necessarily passes through these services, and some of them operate
            outside Canada.
          </p>
        </LegalSection>

        <LegalSection heading='How long any of it is kept'>
          <p>
            Reading stats are kept indefinitely. Once the day rolls over they
            can no longer be connected to a person, so there is little reason
            to discard them. Contact messages are kept until you ask me to
            delete them. Server logs are held briefly by Vercel and then
            discarded automatically.
          </p>
        </LegalSection>

        <LegalSection heading='What you can ask for'>
          <p>
            Ask and I will delete your contact message, or tell you what I hold
            about you. For reading stats there is genuinely nothing to hand
            over or delete on request — I have no way to work out which rows
            are yours, which is rather the point of the design above.
          </p>
          <p>
            Every browser lets you block cookies. Blocking mine costs you
            nothing except retyping post passwords.
          </p>
        </LegalSection>

        <LegalSection heading='Changes'>
          <p>
            If what I collect changes, this page changes with it and the date
            below moves.
          </p>
        </LegalSection>

        <LegalUpdated date={LAST_UPDATED} />
      </LegalProse>
    </main>
  );
}
