import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import PageLayout from '@/components/layout/PageLayout';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { ThemeProvider as ThemeProviderCustom } from '@/context/ThemeContext';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildPersonJsonLd, buildWebSiteJsonLd } from '@/lib/seo/jsonLd';
import { SITE, SITE_URL } from '@/lib/seo';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const ROOT_TITLE = "Kyle's Corner";
const ROOT_DESCRIPTION = 'A personal portfolio website, showcasing... me!';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: ROOT_TITLE,
    template: '%s | Kyle Hagerman',
  },
  description: ROOT_DESCRIPTION,
  applicationName: SITE.name,
  authors: [{ name: SITE.author, url: SITE_URL }],
  creator: SITE.author,
  publisher: SITE.author,
  alternates: { canonical: '/' },
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE.name,
    locale: SITE.locale,
    title: ROOT_TITLE,
    description:
      'Software developer building robust, maintainable systems. Portfolio, projects, and writing.',
  },
  twitter: {
    card: 'summary_large_image',
    title: ROOT_TITLE,
    description:
      'Software developer building robust, maintainable systems. Portfolio, projects, and writing.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3fcfc' },
    { media: '(prefers-color-scheme: dark)', color: '#061113' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en-CA' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <JsonLd data={buildPersonJsonLd()} />
        <JsonLd data={buildWebSiteJsonLd()} />
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <ThemeProviderCustom>
            {/* This custom theme provider will help resolve the theme to light or dark, since system is an option too but we want to know for sure which one it actually is */}
            <PageLayout>{children}</PageLayout>
          </ThemeProviderCustom>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
