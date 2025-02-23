import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: "Contact me if you'd like to chat!",
};

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
