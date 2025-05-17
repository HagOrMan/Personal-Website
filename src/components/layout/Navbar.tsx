import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuViewport,
} from '@/components/ui/NavigationMenu';
import { ThemeModeToggle } from '@/components/menu/ThemeMenu';

import { NavbarItem } from '@/constant/layout/navItems';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import React, { useState } from 'react';

export type NavbarProps = {
  navbarItems: NavbarItem[];
};

export const Navbar = ({ navbarItems }: NavbarProps) => {
  const [value, setValue] = useState(''); // represents the index as a string of the currently chosen navigation item

  // Handles the value changing in the main navigation menu, which is really just an override so we manually control the value.
  const handleValueChange = (newValue: string) => {
    if (newValue !== '') {
      setValue(newValue);
    }
  };

  // Handles the pointer entering a navigation item.
  const handlePointerEnter = async (index: number) => {
    setValue(''); // Set the value to empty to "reset" it, which is important for radix to close the dropdown menu
    if (`${index}` !== value) {
      // the timeout is needed to close the dropdown menu, but we ensure we don't glitch it when we go from the dropdown back to the triggering nav item
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    setValue(`${index}`);
  };

  return (
    <NavigationMenu
      value={value}
      onValueChange={handleValueChange}
      className='sticky top-0 w-full max-w-full'
      onPointerLeave={() => setValue('')}
    >
      <NavigationMenuList>
        {navbarItems.map((item, index) => (
          <NavigationMenuItem key={index} value={`${index}`}>
            {/*First we check if there are any dropdownItems. If yes, map down again.*/}
            {item.dropdownItems ? (
              // First give a trigger to open to dropdown menu with the title of the item
              <>
                <div onPointerEnter={() => handlePointerEnter(index)}>
                  {item.link ? (
                    // Optionally has the trigger also be a link to a page
                    <Link href={item.link}>
                      <NavigationMenuTrigger className='rounded-md hover:bg-lush-800 hover:text-accent-foreground data-[state=open]:bg-lush-800/70'>
                        {item.title}
                      </NavigationMenuTrigger>
                    </Link>
                  ) : (
                    <NavigationMenuTrigger className='rounded-md hover:bg-lush-800 hover:text-accent-foreground'>
                      {item.title}
                    </NavigationMenuTrigger>
                  )}
                </div>

                {/* Next we include all the content needed inside the dropdown */}
                <NavigationMenuContent className='!bg-gradient-to-b from-lush-200 to-breeze-400 focus:shadow-md'>
                  <div
                    className='relative'
                    onPointerEnter={() => setValue(`${index}`)}
                  >
                    <ul className='grid w-[400px] gap-3 p-4 md:w-[500px] lg:w-[600px]'>
                      {item.dropdownItems.map((dropdownItem, index) => (
                        <div key={dropdownItem.title + index}>
                          <ListItem
                            title={dropdownItem.title}
                            href={dropdownItem.link}
                          >
                            {dropdownItem.description || ''}
                          </ListItem>
                        </div>
                      ))}
                    </ul>
                  </div>
                </NavigationMenuContent>
              </>
            ) : (
              // This occurs if there are no dropdown items and there just needs to be a button in the navbar that links somewhere
              <div onPointerEnter={() => handlePointerEnter(index)}>
                <Link href={item.link!} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      'rounded-md hover:bg-lush-800 hover:text-accent-foreground',
                    )}
                  >
                    {item.title}
                  </NavigationMenuLink>
                </Link>
              </div>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>

      {/* Push the theme toggle to the right */}
      <div className='right-0 ml-auto'>
        <ThemeModeToggle />
      </div>

      {/* The Indicator - visually highlights the active menu item */}
      <NavigationMenuIndicator />

      {/* Viewport that holds dropdown content */}
      <NavigationMenuViewport />
    </NavigationMenu>
  );
};

const ListItem = React.forwardRef<
  React.ComponentRef<'a'>,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
            className,
          )}
          {...props}
        >
          <div className='text-sm font-bold leading-none'>{title}</div>
          <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';
