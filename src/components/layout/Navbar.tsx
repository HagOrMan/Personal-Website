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
import React from 'react';

type NavbarProps = {
  navbarItems: NavbarItem[];
};

export const Navbar = ({ navbarItems }: NavbarProps) => {
  return (
    <NavigationMenu className='sticky top-0 w-full max-w-full'>
      <NavigationMenuList>
        {navbarItems.map((item, index) => (
          <NavigationMenuItem key={index}>
            {/*First we check if there are any dropdownItems. If yes, map down again.*/}
            {item.dropdownItems ? (
              // First give a trigger to open to dropdown menu with the title of the item
              <>
                {item.link ? ( // Optionally has the trigger also be a link to a page
                  <Link href={item.link}>
                    <NavigationMenuTrigger className='hover:bg-primaryRgb-800 hover:text-accent-foreground focus:bg-primaryRgb-800 focus:text-accent-foreground data-[state=open]:bg-primaryRgb-800/70 rounded-md'>
                      {item.title}
                    </NavigationMenuTrigger>
                  </Link>
                ) : (
                  <NavigationMenuTrigger className='hover:bg-primaryRgb-800 hover:text-accent-foreground focus:bg-primaryRgb-800 focus:text-accent-foreground rounded-md'>
                    {item.title}
                  </NavigationMenuTrigger>
                )}
                {/* Next we include all the content needed inside the dropdown */}
                <NavigationMenuContent className='!bg-gradient-to-b from-green-200 to-teal-500 focus:shadow-md'>
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
                </NavigationMenuContent>
              </>
            ) : (
              // This occurs if there are no dropdown items and there just needs to be a button in the navbar that links somewhere
              <Link href={item.link!} legacyBehavior passHref>
                <NavigationMenuLink
                  className={cn(
                    navigationMenuTriggerStyle(),
                    'hover:bg-primaryRgb-800 hover:text-accent-foreground focus:bg-primaryRgb-800 focus:text-accent-foreground rounded-md',
                  )}
                >
                  {item.title}
                </NavigationMenuLink>
              </Link>
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
            'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors',
            className,
          )}
          {...props}
        >
          <div className='text-sm font-bold leading-none'>{title}</div>
          <p className='text-muted-foreground line-clamp-2 text-sm leading-snug'>
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';
