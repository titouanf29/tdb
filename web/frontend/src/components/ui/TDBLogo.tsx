"use client";

import { CaptenMark } from "@/components/design-system/Logo";

/**
 * Kept as a thin wrapper rather than deleted.
 *
 * Four screens still import TDBLogo, three of them on the un-migrated dark
 * theme. Re-pointing the name at the new mark updates all of them at once and
 * keeps the rebuild from needing a flag day — and because the mark draws in
 * `currentColor`, it lands correctly on the dark sidebar without a single
 * call site changing.
 *
 * New code should import CaptenMark or CaptenLogo directly.
 */

interface TDBLogoProps {
  size?: number;
  className?: string;
}

export function TDBLogo({ size = 36, className = "" }: TDBLogoProps) {
  return <CaptenMark size={size} className={className} />;
}

export function TDBLogoSm({ size = 20, className = "" }: TDBLogoProps) {
  return <CaptenMark size={size} className={className} />;
}
