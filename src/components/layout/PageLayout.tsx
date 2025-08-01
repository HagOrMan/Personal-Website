'use client';
import { usePathname } from 'next/navigation';

import Footer from '@/components/layout/Footer';
import { HamburgerMenu } from '@/components/layout/HamburgerMenu';
import { Navbar } from '@/components/layout/Navbar';
import { navbarItems } from '@/constant/layout/navItems';

export default function PageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // Define pages that should NOT have a footer
  const hideFooter = ['/contact'];

  return (
    <>
      {/* Each of the below will conditionally render based on the screen size */}
      <Navbar navbarItems={navbarItems} />
      <HamburgerMenu navbarItems={navbarItems} />
      {children}
      {!hideFooter.includes(pathname) && <Footer navbarItems={navbarItems} />}
    </>
  );
}
