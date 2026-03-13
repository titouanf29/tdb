'use client';

import Link from 'next/link';
import { trackEvent } from '@/lib/tracking';
import { MouseEvent, ReactNode } from 'react';

type CtaButtonProps = {
  children: ReactNode;
  href: string;
  location: string;
  targetLabel: string;
  variant?: 'primary' | 'secondary';
  external?: boolean;
};

export function CtaButton({
  children,
  href,
  location,
  targetLabel,
  variant = 'primary',
  external = false,
}: CtaButtonProps) {
  const className = variant === 'primary' ? 'btn btn-primary' : 'btn btn-secondary';

  const handleClick = (_event: MouseEvent<HTMLAnchorElement>) => {
    trackEvent({
      event: 'cta_click',
      location,
      target: targetLabel,
    });
  };

  if (external) {
    return (
      <a className={className} href={href} onClick={handleClick} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href} onClick={handleClick}>
      {children}
    </Link>
  );
}