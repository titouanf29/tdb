"use client";

interface TDBLogoProps {
  size?: number;
  className?: string;
}

/**
 * TDB Logo — golden gradient arrow with stock-chart zigzag on dark navy background.
 */
export function TDBLogo({ size = 36, className = "" }: TDBLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="tdb-gold" x1="8" y1="32" x2="30" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6B3D00" />
          <stop offset="35%"  stopColor="#B8720A" />
          <stop offset="70%"  stopColor="#E8A820" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <linearGradient id="tdb-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0D1E30" />
          <stop offset="100%" stopColor="#091525" />
        </linearGradient>
        <filter id="tdb-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Dark navy background */}
      <rect width="40" height="40" rx="9" fill="url(#tdb-bg)" />

      {/* Chart line: bottom-left → zigzag → upper-right */}
      <polyline
        points="8,32 14,21 17.5,26 21,17.5 24,23 27.5,13"
        stroke="url(#tdb-gold)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#tdb-glow)"
      />

      {/* Arrowhead — filled triangle at the end of the line */}
      <path
        d="M 23.5 9 L 32 16 L 27.5 13 Z"
        fill="url(#tdb-gold)"
        filter="url(#tdb-glow)"
      />
    </svg>
  );
}

/** Compact version for small contexts */
export function TDBLogoSm({ size = 20, className = "" }: TDBLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="tdb-gold-sm" x1="8" y1="32" x2="30" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6B3D00" />
          <stop offset="35%"  stopColor="#B8720A" />
          <stop offset="70%"  stopColor="#E8A820" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <linearGradient id="tdb-bg-sm" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0D1E30" />
          <stop offset="100%" stopColor="#091525" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="9" fill="url(#tdb-bg-sm)" />
      <polyline
        points="8,32 14,21 17.5,26 21,17.5 24,23 27.5,13"
        stroke="url(#tdb-gold-sm)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M 23.5 9 L 32 16 L 27.5 13 Z" fill="url(#tdb-gold-sm)" />
    </svg>
  );
}
