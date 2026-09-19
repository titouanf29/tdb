"use client";

import { cn } from "@/lib/utils";

/**
 * The CaptenTDB mark: a bearing taken.
 *
 * A compass ring, a heading drawn inside it, and the point being steered
 * toward. It says navigation without depicting a single nautical object, which
 * is the whole rule of this identity — an anchor or a helm would turn a
 * considered product into a themed one.
 *
 * The ring and the heading are `currentColor`, so the mark simply takes the
 * colour of the text around it: navy on the light screens, near-white on the
 * dark ones, and correct inside a button without anyone passing a prop. Only
 * the destination stays fixed, in amber — it is the one thing that should not
 * blend in.
 */
export function CaptenMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <circle
        cx="12" cy="12" r="10.25"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.32"
      />
      {/* The heading. Open at the bottom: a course under way, not a closed
          shape. */}
      <path
        d="M6 16 L 12 6.6 L 18 16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="6.6" r="2.1" fill="var(--cap-amber, #E5A83A)" />
    </svg>
  );
}

/** The mark with the name beside it. */
export function CaptenLogo({
  size = 22,
  className,
  showName = true,
}: {
  size?: number;
  className?: string;
  showName?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <CaptenMark size={size} />
      {showName && (
        <span
          className="font-semibold tracking-[-0.02em]"
          style={{
            fontFamily: "var(--cap-font-display)",
            fontSize: `${size * 0.82}px`,
            lineHeight: 1,
          }}
        >
          CaptenTDB
        </span>
      )}
    </span>
  );
}
