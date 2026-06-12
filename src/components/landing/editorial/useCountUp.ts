'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/**
 * inView 진입 시 0 → target 카운트업 (1회, rAF + cubic ease-out).
 * 반환된 ref를 표시 요소에 연결하면 50% 노출 시점에 시작.
 * prefers-reduced-motion 시 즉시 최종값.
 */
export function useCountUp<T extends HTMLElement = HTMLParagraphElement>(
  target: number,
  { duration = 1600 }: { duration?: number } = {},
) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, target, duration]);

  return { ref, value };
}
