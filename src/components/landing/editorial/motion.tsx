'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * 공개 표면(랜딩 등) 스크롤 reveal 모션.
 *
 * 랜딩은 자체 스크롤 컨테이너(h-dvh overflow-y-auto)지만 컨테이너가 뷰포트 전체 크기라
 * root=null IntersectionObserver(whileInView 기본)가 조상 클리핑을 반영해 그대로 동작.
 * ⚠️ useScroll/scrollspy/스크롤연동 게이지는 container ref가 필요 — 의도적으로 미제공.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** 단일 요소 reveal — 1회, 20% 노출 시 발화. */
export function Reveal({
  children, delay = 0, className,
}: {
  children: ReactNode; delay?: number; className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** 자식 RevealItem들을 0.08s 시차로 등장시키는 컨테이너. */
export function RevealStagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/** RevealStagger 안에서 사용하는 시차 등장 아이템. */
export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  );
}
