import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { siteConfig } from '@/lib/site-config';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' });
const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-title' });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'TDB | Assistant IA Trading',
    template: '%s | TDB',
  },
  description: siteConfig.description,
  keywords: [
    'bot trading',
    'trading ia',
    'telegram trading bot',
    'paper trading',
    'education trading',
  ],
  openGraph: {
    title: 'TDB | Assistant IA Trading',
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: 'TDB',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TDB | Assistant IA Trading',
    description: siteConfig.description,
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${manrope.variable} ${space.variable}`}>
        <div className="glow" aria-hidden />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}