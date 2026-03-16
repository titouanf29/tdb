import { useEffect, useRef, useState } from "react";

/**
 * Returns true once the referenced element enters the viewport.
 * Disconnects the observer after first trigger (fire-once).
 */
export function useInView(
  ref: React.RefObject<Element>,
  threshold = 0.1
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}
