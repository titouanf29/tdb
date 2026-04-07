"use client";

interface TDBLogoProps {
  size?: number;
  className?: string;
}

/**
 * TDB Logo — organic rounded shape inspired by modern AI brand aesthetics.
 * Clean gradient (cyan → blue → purple) with abstract ascending-bars inner mark.
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
        <linearGradient id="tdb-fill" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00c5ff" />
          <stop offset="48%"  stopColor="#4472f5" />
          <stop offset="100%" stopColor="#9b54e8" />
        </linearGradient>
        <linearGradient id="tdb-fill-sm" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00c5ff" />
          <stop offset="48%"  stopColor="#4472f5" />
          <stop offset="100%" stopColor="#9b54e8" />
        </linearGradient>
        <filter id="tdb-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Organic rounded shape — slightly asymmetric for personality */}
      <path
        d="M20 2
           C26.5 2, 34 6.5, 36.5 13
           C39 19.5, 37 28.5, 32 33.5
           C27 38.5, 16 39.5, 10 35.5
           C4 31.5, 1.5 22.5, 3 15
           C4.5 7.5, 13.5 2, 20 2 Z"
        fill="url(#tdb-fill)"
        filter="url(#tdb-glow)"
      />

      {/* Inner mark: three ascending bars — chart / data aesthetic */}
      <rect x="9"    y="24" width="5.5" height="9"  rx="2" fill="white" opacity="0.9" />
      <rect x="17.3" y="17" width="5.5" height="16" rx="2" fill="white" opacity="0.9" />
      <rect x="25.5" y="11" width="5.5" height="22" rx="2" fill="white" opacity="0.9" />

      {/* Subtle top connector line */}
      <path
        d="M11.75 24 Q14.5 20, 20.05 17 Q24 14, 28.25 11"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

/** Compact version for small contexts (footer, etc.) */
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
        <linearGradient id="tdb-sm-fill" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00c5ff" />
          <stop offset="48%"  stopColor="#4472f5" />
          <stop offset="100%" stopColor="#9b54e8" />
        </linearGradient>
      </defs>
      <path
        d="M20 2 C26.5 2, 34 6.5, 36.5 13 C39 19.5, 37 28.5, 32 33.5 C27 38.5, 16 39.5, 10 35.5 C4 31.5, 1.5 22.5, 3 15 C4.5 7.5, 13.5 2, 20 2 Z"
        fill="url(#tdb-sm-fill)"
      />
      <rect x="9"    y="24" width="5.5" height="9"  rx="2" fill="white" opacity="0.9" />
      <rect x="17.3" y="17" width="5.5" height="16" rx="2" fill="white" opacity="0.9" />
      <rect x="25.5" y="11" width="5.5" height="22" rx="2" fill="white" opacity="0.9" />
    </svg>
  );
}
