import GitHubIcon from '@/components/icons/GithubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { NavbarProps } from '@/components/layout/Navbar';
import Link from 'next/link';

export default function Footer({ navbarItems }: NavbarProps) {
  return (
    <footer className='sticky w-full bg-background py-6 text-center text-white shadow-inner md:py-0'>
      <div className='mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row'>
        {/* Social Links */}
        <div className='flex gap-4'>
          <a
            href='https://github.com/hagorman'
            target='_blank'
            rel='noopener noreferrer'
          >
            <GitHubIcon
              className='cursor-newtab h-6 w-6'
              useThemeForImgSource
            />
          </a>
          <a
            href='https://linkedin.com/in/kyle-hagerman-se'
            target='_blank'
            rel='noopener noreferrer'
          >
            <LinkedInIcon
              className='cursor-newtab h-6 w-6 dark:invert'
              colour='dark'
            />
          </a>
        </div>

        {/* Contact Input */}
        <div className='flex w-full flex-col gap-1 md:w-auto'>
          {navbarItems.map((item, index) => (
            <div key={index} className='text-primary-foreground'>
              {item.link ? ( // Optionally has the trigger also be a link to a page
                <Link href={item.link} className='text-black dark:text-white'>
                  {item.title}
                </Link>
              ) : (
                <>{item.title}</>
              )}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
