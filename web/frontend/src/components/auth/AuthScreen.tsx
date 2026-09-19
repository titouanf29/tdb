"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  CaptenLogo, CloudBank, Contours, LiveBackdrop, Text, Waypoint,
} from "@/components/design-system";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

/**
 * The frame both auth screens sit in.
 *
 * Two columns on a wide screen: what this place is on the left, the form on
 * the right. On a phone the left column disappears entirely rather than being
 * stacked above — someone who has already decided to sign in does not need the
 * argument repeated, and making them scroll past it to reach the password
 * field would be the opposite of helpful.
 *
 * The weather is the quiet version of the landing page's: a bank of cloud tops
 * along the bottom and a few contour lines, no drifting sky. A form is a place
 * to concentrate.
 */
export function AuthScreen({
  eyebrow,
  title,
  lead,
  points,
  children,
  footer,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead: string;
  points: string[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="cap relative min-h-screen overflow-hidden">
      <Contours className="absolute inset-x-0 top-0 h-[340px] w-full" lines={3} opacity={0.5} />
      <LiveBackdrop clouds={false} opacity={0.4} />
      <CloudBank />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[78rem] grid-cols-1 items-center gap-16 px-6 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-24 lg:py-16">
        {/* ── Left: where you are ──────────────────────────────────────── */}
        <div className="hidden lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[0.875rem] transition-colors hover:text-[color:var(--cap-ink)]"
            style={{ color: "var(--cap-ink-2)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>

          <div className="mt-14 max-w-[28rem]">
            <p
              className="text-[0.73rem] font-medium uppercase tracking-[0.16em]"
              style={{ color: "var(--cap-ocean)" }}
            >
              {eyebrow}
            </p>
            <h1
              className="mt-5 text-[clamp(2rem,3.4vw,2.9rem)] font-semibold leading-[1.08] tracking-[-0.03em]"
              style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
            >
              {title}
            </h1>
            <Text size="lead" className="mt-6">
              {lead}
            </Text>

            <ul className="mt-10 space-y-3.5">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <Waypoint size={11} className="mt-[5px]" />
                  <Text size="small" tone="ink" as="span">{p}</Text>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Right: the form ──────────────────────────────────────────── */}
        <div className="w-full">
          {/* The mobile header. Everything the left column carries, compressed
              to one line, because on a phone the form is the whole screen. */}
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
              style={{ color: "var(--cap-ink)" }}
              aria-label="Retour à l'accueil"
            >
              <CaptenLogo size={21} />
            </Link>
            <LanguageToggle variant="compact" />
          </div>

          <div
            className="p-6 sm:p-8"
            style={{
              borderRadius: "var(--cap-r-xl)",
              backgroundColor: "var(--cap-surface)",
              boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow-lg)",
            }}
          >
            {children}
          </div>

          {footer && <div className="mt-6">{footer}</div>}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.78rem]">
            <span style={{ color: "var(--cap-ink-3)" }}>
              Argent virtuel uniquement
            </span>
            {[
              { href: "/cgu", label: "CGU" },
              { href: "/politique-de-confidentialite", label: "Confidentialité" },
              { href: "/mentions-legales", label: "Mentions légales" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="transition-colors hover:text-[color:var(--cap-ink)]"
                style={{ color: "var(--cap-ink-3)" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* The language toggle lives out of the way on wide screens. */}
      <div className="absolute right-6 top-8 hidden lg:block">
        <LanguageToggle variant="compact" />
      </div>
    </div>
  );
}
