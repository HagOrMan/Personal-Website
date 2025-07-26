'use client';

import * as React from 'react';
import { Menu, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/Sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/Collapsible';
import { cn } from '@/lib/utils';
import { NavbarProps } from '@/components/layout/Navbar';
import { NavbarItem } from '@/constant/layout/navItems';

type MenuItemProp = {
  item: NavbarItem;
};

const MenuItemComponent = ({ item }: MenuItemProp) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (item.dropdownItems) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'hover:text-primary flex w-full items-center justify-between py-2 pr-4 text-lg font-medium transition-colors',
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
          {item.dropdownItems.map((subItem) => (
            <a
              key={subItem.title}
              href={subItem.link}
              className={cn(
                'hover:text-primary block py-2 pl-6 text-lg font-medium transition-colors',
              )}
            >
              {subItem.title}
            </a>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <a
      href={item.link}
      className={cn(
        'hover:text-primary block py-2 text-lg font-medium transition-colors',
        item.link === '/' && 'text-primary',
      )}
    >
      {item.title}
    </a>
  );
};

export const HamburgerMenu = ({ navbarItems }: NavbarProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className='bg-background block md:hidden'>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant='ghost' size='icon' className='md:hidden'>
            <Menu className='h-5 w-5' />
            <span className='sr-only'>Toggle menu</span>
          </Button>
        </SheetTrigger>
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
    </div>
  );
};
