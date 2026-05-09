'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ChevronDown, ChevronRight, Menu } from 'lucide-react';

import { NavbarProps } from '@/components/layout/Navbar';
import { ThemeModeToggle } from '@/components/menu/ThemeMenu';
import { Button } from '@/components/ui/Button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/Collapsible';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/Sheet';
import { NavbarItem } from '@/constant/layout/navItems';
import { cn } from '@/lib/utils';

type MenuItemProp = {
  item: NavbarItem;
};

const MenuItemComponent = ({ item }: MenuItemProp) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const pathname = usePathname();

  if (item.dropdownItems) {
    // Determine if the parent category should be marked as active
    const isChildActive = item.dropdownItems.some((subItem) => {
      const isExactMatch = pathname === subItem.link;
      const isRootLink = subItem.link.split('/').length === 2;
      const isNestedMatch =
        pathname.startsWith(subItem.link + '/') && !isRootLink;

      return isExactMatch || isNestedMatch;
    });

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'hover:text-primary flex w-full items-center justify-between py-2 pr-4 text-lg font-medium transition-colors',
              // If a child is active but the dropdown is CLOSED: project tab gets the full primary color
              isChildActive && !isOpen && 'text-primary',
              // If a child is active and the dropdown is OPEN: mute the project tab, but keep it visibly active
              isChildActive && isOpen && 'text-primary/80',
            )}
          >
            {item.title}
            {isOpen ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronRight className='h-4 w-4' />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {item.dropdownItems.map((subItem) => {
            // EXACT MATCH: The URL perfectly matches the sub-item link.
            const isExactMatch = pathname === subItem.link;

            // IDENTIFY ROOT LINKS: Detect if this is an overview page (e.g., '/projects')
            // Splitting '/projects' by '/' yields ['', 'projects'] (length 2).
            // Splitting '/projects/monpoke' yields ['', 'projects', 'monpoke'] (length 3).
            const isRootLink = subItem.link.split('/').length === 2;

            // NESTED MATCH: Allow deep-route highlighting, BUT exclude the root link.
            const isNestedMatch =
              pathname.startsWith(subItem.link + '/') && !isRootLink;

            const isSubActive = isExactMatch || isNestedMatch;
            return (
              <a
                key={subItem.title}
                href={subItem.link}
                className={cn(
                  'hover:text-primary block py-2 pl-6 text-lg font-medium transition-colors',
                  // The exact active subproject gets the full primary color
                  isSubActive && 'text-primary',
                )}
              >
                {subItem.title}
              </a>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Logic for standard (non-dropdown) links
  const isActive = pathname === item.link;
  const isHome = item.link === '/';

  return (
    <a
      href={item.link}
      className={cn(
        'hover:text-primary block py-2 text-lg font-medium transition-colors',
        // The active page gets the standard color
        isActive && 'text-primary',
        // If the link is Home AND it is not currently active, it gets a unique breeze blue
        !isActive && isHome && 'text-breeze-300/90',
      )}
    >
      {item.title}
    </a>
  );
};

export const HamburgerMenu = ({ navbarItems }: NavbarProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className='bg-background sticky top-0 z-50 flex md:hidden'>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant='ghost' size='icon' className='md:hidden'>
            <Menu className='h-5 w-5' />
            <span className='sr-only'>Toggle menu</span>
          </Button>
        </SheetTrigger>

        <VisuallyHidden>
          <SheetTitle>Hamburger Menu</SheetTitle>
        </VisuallyHidden>

        <SheetContent
          side='left'
          className='w-[240px] overflow-y-scroll sm:w-[300px]'
        >
          <nav className='flex flex-col space-y-3 py-1 pl-4'>
            {navbarItems.map((item) => (
              <MenuItemComponent key={item.title} item={item} />
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      {/* Push the theme toggle to the right */}
      <div className='right-0 ml-auto'>
        <ThemeModeToggle />
      </div>
    </div>
  );
};
