import React from 'react';
import Link from 'next/link';

import GitHubIcon from '@/components/icons/GithubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { NavbarProps } from '@/components/layout/Navbar';
import { GradientTextHover } from '@/components/ui/GradientTextHover';
import { HaloRingHover } from '@/components/ui/HaloRingHover';
import { Separator } from '@/components/ui/Separator';
import { GitHubLink, LinkedInLink } from '@/constant/socials';

export default function Footer({ navbarItems }: NavbarProps) {
  return (
    <footer className='bg-background sticky w-full py-6 text-center shadow-inner md:py-2'>
      <div className='mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 align-middle md:flex-row'>
        {/* Social Links */}
        <div className='flex gap-4'>
          <HaloRingHover className='rounded-full shadow-[0_2px_10px_hsl(var(--accent)_/_0.2)] hover:shadow-[0_3px_20px_rgb(var(--tw-color-lush-600)_/_1.0)]'>
            <Link
              href={GitHubLink}
              target='_blank'
              rel='noopener noreferrer'
              className='cursor-newtab'
            >
              <GitHubIcon className='h-6 w-6' useThemeForImgSource />
            </Link>
          </HaloRingHover>

          <HaloRingHover
            gradientStops={[
              { colour: 'transparent', position: 35 },
              { colour: 'lush-500', opacity: 0.5, position: 45 },
              { colour: 'lush-500', opacity: 0.2, position: 80 },
              { colour: 'transparent', position: 90 },
            ]}
            className='shadow-[0_2px_10px_hsl(var(--accent)_/_0.2)] hover:shadow-[0_3px_20px_rgb(var(--tw-color-lush-600)_/_1.0)]'
          >
            <Link
              href={LinkedInLink}
              target='_blank'
              rel='noopener noreferrer'
              className='cursor-newtab'
            >
              <LinkedInIcon className='h-6 w-6 dark:invert' colour='black' />
            </Link>
          </HaloRingHover>
        </div>

        {/* Copyright or Optional Signature */}
        <div className='text-foreground hidden md:block'>
          © {new Date().getFullYear()} Kyle Hagerman
        </div>

        {/* Show all navigation items separated by a separator */}
        <div className='flex h-full flex-wrap items-center justify-center'>
          {navbarItems.map((item, index) => {
            if (!item.link) return null;

            return (
              <React.Fragment key={index}>
                <GradientTextHover asChild>
                  <Link href={item.link}>{item.title}</Link>
                </GradientTextHover>
                {/* Separator (not rendered if the last item) */}
                {index < navbarItems.length - 1 && (
                  <Separator
                    orientation='vertical'
                    className='bg-accent border-accent mx-2 border data-[orientation=vertical]:h-5'
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
