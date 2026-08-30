'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
  },
} as const;

interface MotionStaggerProps {
  children: ReactNode;
  className?: string;
}

/** Framer Motion 기반 stagger 컨테이너 — 자식 요소가 순차 등장 */
export function MotionStagger({ children, className }: MotionStaggerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface MotionItemProps {
  children: ReactNode;
  className?: string;
}

/** MotionStagger 내부에서 사용하는 개별 아이템 */
export function MotionItem({ children, className }: MotionItemProps) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
