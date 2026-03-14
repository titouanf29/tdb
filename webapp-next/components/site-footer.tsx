import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export function SiteFooter() {
  return (
    <footer className="footer-shell">
      <div className="container site-footer">
        <p>(c) {new Date().getFullYear()} {siteConfig.name}</p>
        <div className="footer-links">
          <a href={siteConfig.telegramUrl} target="_blank" rel="noreferrer">
            Telegram
          </a>
          <a href={siteConfig.discordUrl} target="_blank" rel="noreferrer">
            Discord
          </a>
          <a href={`mailto:${siteConfig.contactEmail}`}>Contact</a>
          <Link href="/legal/mentions-legales">Mentions legales</Link>
          <Link href="/legal/confidentialite">Confidentialite</Link>
          <Link href="/legal/disclaimer">Disclaimer</Link>
        </div>
      </div>
    </footer>
  );
}