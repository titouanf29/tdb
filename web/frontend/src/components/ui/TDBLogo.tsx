"use client";

interface TDBLogoProps {
  size?: number;
  className?: string;
}

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
        <linearGradient id="tdb-gold" x1="10" y1="34" x2="33" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7B4800" />
          <stop offset="30%"  stopColor="#B8720A" />
          <stop offset="65%"  stopColor="#E8A820" />
          <stop offset="100%" stopColor="#FFE033" />
        </linearGradient>
        <linearGradient id="tdb-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0D1E30" />
          <stop offset="100%" stopColor="#071320" />
        </linearGradient>
        <filter id="tdb-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="40" height="40" rx="9" fill="url(#tdb-bg)" />

      {/* Shadow/trail at the bottom (depth effect) */}
      <polyline
        points="10,34 19,19 24,25 28.5,14"
        stroke="#7B4800"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.35"
      />

      {/* Main arrow line */}
      <polyline
        points="10,34 19,19 24,25 28.5,14"
        stroke="url(#tdb-gold)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#tdb-glow)"
      />

      {/* Arrowhead — filled triangle */}
      <polygon
        points="33,6 24,11 30,17"
        fill="url(#tdb-gold)"
        filter="url(#tdb-glow)"
      />
    </svg>
  );
}

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
        <linearGradient id="tdb-gold-sm" x1="10" y1="34" x2="33" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7B4800" />
          <stop offset="30%"  stopColor="#B8720A" />
          <stop offset="65%"  stopColor="#E8A820" />
          <stop offset="100%" stopColor="#FFE033" />
        </linearGradient>
        <linearGradient id="tdb-bg-sm" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0D1E30" />
          <stop offset="100%" stopColor="#071320" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="9" fill="url(#tdb-bg-sm)" />
      <polyline
        points="10,34 19,19 24,25 28.5,14"
        stroke="url(#tdb-gold-sm)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <polygon points="33,6 24,11 30,17" fill="url(#tdb-gold-sm)" />
    </svg>
  );
}
