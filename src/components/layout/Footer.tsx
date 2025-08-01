import React from 'react';
import Link from 'next/link';

import GitHubIcon from '@/components/icons/GithubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { NavbarProps } from '@/components/layout/Navbar';
import { GradientTextHover } from '@/components/ui/GradientTextHover';
import { Separator } from '@/components/ui/Separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

export default function Footer({ navbarItems }: NavbarProps) {
  return (
    <footer className='bg-background sticky w-full py-6 text-center shadow-inner md:py-2'>
      <div className='mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 align-middle md:flex-row'>
        {/* Social Links */}
        <div className='flex gap-4'>
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent
              className='bg-nebula-800'
              classNameArrow='bg-nebula-800 fill-nebula-800'
            >
              <p>Github/HagOrMan</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href='https://linkedin.com/in/kyle-hagerman-se'
                target='_blank'
                rel='noopener noreferrer'
              >
                <LinkedInIcon
                  className='cursor-newtab h-6 w-6 dark:invert'
                  colour='black'
                />
              </a>
            </TooltipTrigger>
            <TooltipContent
              className='bg-nebula-800'
              classNameArrow='bg-nebula-800 fill-nebula-800'
            >
              <p>LinkedIn/kyle-hagerman-se</p>
            </TooltipContent>
          </Tooltip>
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
