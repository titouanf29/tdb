"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/hooks/useInView";

interface Props {
  value: number;
  /** Animation duration in ms (default 900) */
  duration?: number;
  /** Called with the interpolated value; should return a display string */
  formatter: (v: number) => string;
  className?: string;
}

/**
 * Counts up from 0 (or previous value) to `value` once the element enters the
 * viewport.  Re-animates from current display whenever `value` changes.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  formatter,
  className,
}: Props) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(spanRef as React.RefObject<Element>);

  const [displayValue, setDisplayValue] = useState(0);
  const displayRef = useRef(0); // mirror of displayValue to avoid stale closures
  const rafRef = useRef<number | null>(null);
  const animatedOnce = useRef(false);

  const setDisplay = (v: number) => {
    displayRef.current = v;
    setDisplayValue(v);
  };

  const animateTo = (from: number, to: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  // Trigger on first viewport entry OR whenever `value` changes while visible
  useEffect(() => {
    if (!inView) return;
    if (!animatedOnce.current) animatedOnce.current = true;
    animateTo(displayRef.current, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  return (
    <span ref={spanRef} className={className}>
      {formatter(displayValue)}
    </span>
  );
}
