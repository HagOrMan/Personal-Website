import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
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

  // Find navigation items that need dropdowns since only those should have their value set
  const dropdownIndices = navbarItems.reduce<string[]>(
    (acc, navItem, index) => {
      if (navItem.dropdownItems !== undefined) {
        acc.push(`${index}`);
      }
      return acc;
    },
    [],
  );

  // Wrapper to first check if the string is is the list of indices we want to consider. If not, set it to empty string.
  // Only used in functions where we might not be setting the value to a dropdown nav item
  const setValueWrapper = (newValue: string) => {
    setValue(dropdownIndices.includes(newValue) ? newValue : '');
  };

  // Handles the value changing in the main navigation menu, which is really just an override so we manually control the value.
  const handleValueChange = (newValue: string) => {
    if (newValue !== '') {
      setValueWrapper(newValue);
    }
  };

  // Handles the pointer entering a navigation item.
  const handlePointerEnter = async (index: number) => {
    setValue(''); // Set the value to empty to "reset" it, which is important for radix to close the dropdown menu
    if (`${index}` !== value) {
      // the timeout is needed to close the dropdown menu, but we ensure we don't glitch it when we go from the dropdown back to the triggering nav item
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    setValueWrapper(`${index}`);
  };

  return (
    <NavigationMenu
      value={value}
      onValueChange={handleValueChange}
      className='bg-background sticky top-0 w-full max-w-full'
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
                      <NavigationMenuTrigger className='hover:bg-primary hover:text-accent-foreground data-[state=open]:bg-primary/70 rounded-md'>
                        {item.title}
                      </NavigationMenuTrigger>
                    </Link>
                  ) : (
                    <NavigationMenuTrigger className='hover:bg-primary hover:text-accent-foreground active:bg-lush-700/80 rounded-md'>
                      {item.title}
                    </NavigationMenuTrigger>
                  )}
                </div>

                {/* Next we include all the content needed inside the dropdown */}
                <NavigationMenuContent className='from-lush-200 to-breeze-400 dark:from-lush-800 dark:to-breeze-800 bg-linear-to-b! focus:shadow-md'>
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
                <NavigationMenuLink asChild>
                  <Link
                    className={cn(
                      navigationMenuTriggerStyle(),
                      'hover:bg-primary hover:text-accent-foreground active:bg-lush-700/80 rounded-md',
                    )}
                    href={item.link!}
                  >
                    {item.title}
                  </Link>
                </NavigationMenuLink>
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
      <NavigationMenuIndicator classNameTriangle='bg-primary/90' />
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
            'hover:bg-accent hover:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-colors select-none',
            className,
          )}
          {...props}
        >
          <div className='text-sm leading-none font-bold'>{title}</div>
          <p className='text-muted-foreground line-clamp-2 text-sm leading-snug'>
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';
