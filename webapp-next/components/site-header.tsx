import Link from 'next/link';
import { CtaButton } from '@/components/cta-button';
import { navLinks, siteConfig } from '@/lib/site-config';

export function SiteHeader() {
  return (
    <header className="header-shell">
      <div className="container site-header">
        <Link className="brand" href="/">
          {siteConfig.name}
        </Link>

        <nav className="desktop-nav" aria-label="Navigation principale">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <CtaButton
          href={siteConfig.telegramUrl}
          location="header"
          targetLabel="telegram"
          external
        >
          Rejoindre Telegram
        </CtaButton>
      </div>
    </header>
  );
}