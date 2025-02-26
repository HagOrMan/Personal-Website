'use client';
import { Navbar } from '@/components/layout/Navbar';
import { navbarItems } from '@/constant/layout/navItems';
import Footer from '@/components/layout/Footer';
import { usePathname } from 'next/navigation';

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
      <Navbar navbarItems={navbarItems} />
      {children}
      {!hideFooter.includes(pathname) && <Footer navbarItems={navbarItems} />}
    </>
  );
}
