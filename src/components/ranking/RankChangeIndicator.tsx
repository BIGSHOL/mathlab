'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface RankChangeIndicatorProps {
  change: number;
  isNew?: boolean;
  size?: 'sm' | 'md';
}

/** 음악방송 스타일 순위 변동 표시 (한국: 상승=빨강, 하락=파랑) */
export function RankChangeIndicator({ change, isNew, size = 'md' }: RankChangeIndicatorProps) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  if (isNew) {
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 300 }}
        className={`${textSize} font-extrabold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded`}
      >
        NEW
      </motion.span>
    );
  }

  if (change > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-0.5 text-red-500 font-bold ${textSize}`}
      >
        <TrendingUp className={iconSize} />
        <span>{change}</span>
      </motion.div>
    );
  }

  if (change < 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-0.5 text-blue-500 font-bold ${textSize}`}
      >
        <TrendingDown className={iconSize} />
        <span>{Math.abs(change)}</span>
      </motion.div>
    );
  }

  return <Minus className={`${iconSize} text-slate-300`} />;
}
