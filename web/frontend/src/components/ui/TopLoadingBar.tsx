"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function TopLoadingBar({ isLoading }: { isLoading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isLoading) {
      setVisible(true);
      setProgress(15);
      timerRef.current = setTimeout(() => setProgress(70), 200);
    } else {
      setProgress(100);
      timerRef.current = setTimeout(() => setVisible(false), 350);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isLoading]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <motion.div
            className="h-full rounded-r-full"
            style={{
              background: "linear-gradient(90deg, hsl(230 90% 62%), hsl(195 100% 50%), hsl(270 80% 65%))",
              boxShadow: "0 0 8px hsl(230 90% 62% / 0.7)",
            }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: progress === 100 ? 0.15 : progress === 70 ? 1.8 : 0.3,
              ease: progress === 70 ? [0.1, 0.4, 0.3, 1] : "easeOut",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
