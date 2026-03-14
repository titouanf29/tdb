'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CtaButton } from '@/components/cta-button';
import { navLinks, siteConfig } from '@/lib/site-config';

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="header-shell">
      <div className="container site-header">
        <Link className="brand" href="/" onClick={() => setMobileOpen(false)}>
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

        <button
          className="mobile-menu-btn"
          aria-label="Menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className={`hamburger ${mobileOpen ? 'open' : ''}`} />
        </button>
      </div>

      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Navigation mobile">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <a
            href={siteConfig.telegramUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMobileOpen(false)}
            className="btn btn-primary mobile-nav-cta"
          >
            Rejoindre Telegram
          </a>
        </nav>
      )}
    </header>
  );
}
