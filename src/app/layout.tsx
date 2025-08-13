import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { Analytics } from '@vercel/analytics/react';

import PageLayout from '@/components/layout/PageLayout';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { ThemeProvider as ThemeProviderCustom } from '@/context/ThemeContext';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Kyle's Corner",
  description: 'A personal portfolio website, showcasing... me!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem
          disableTransitionOnChange
        >
          <ThemeProviderCustom>
            {/* This custom theme provider will help resolve the theme to light or dark, since system is an option too but we want to know for sure which one it actually is */}
            <PageLayout>{children}</PageLayout>
            <Analytics />
          </ThemeProviderCustom>
        </ThemeProvider>
      </body>
    </html>
  );
}
