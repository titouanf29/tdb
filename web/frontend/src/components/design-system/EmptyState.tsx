"use client";

import { Button } from "./Button";
import { Heading, Text } from "./Text";

/**
 * Nothing here yet — said as a sentence, with the next step attached.
 *
 * An empty screen is a moment of doubt ("is it broken? am I lost?"), so it
 * gets a plain explanation and exactly one thing to do. No illustration of a
 * sad box.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="mx-auto max-w-sm py-14 text-center">
      {/* The one motif: a route that stops. Decorative, and hidden from
          assistive tech because it adds nothing a screen reader can use. */}
      <svg aria-hidden viewBox="0 0 120 40" className="mx-auto mb-6 h-10 w-[120px]">
        <path
          d="M4 30 C 28 30, 34 14, 58 14 C 78 14, 84 22, 100 22"
          fill="none"
          stroke="var(--cap-line-strong)"
          strokeWidth="1.25"
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
        <circle cx="4" cy="30" r="2.5" fill="var(--cap-ink-4)" />
        <circle cx="100" cy="22" r="3" fill="none" stroke="var(--cap-ocean)" strokeWidth="1.25" />
      </svg>

      <Heading level={3}>{title}</Heading>
      {description && (
        <Text size="small" className="mx-auto mt-2">
          {description}
        </Text>
      )}
      {action && (
        <div className="mt-6">
          <Button href={action.href} onClick={action.onClick} variant="secondary" size="md">
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
