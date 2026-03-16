'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import GemStone from './GemStone';
import { GEM_STAGE_LABELS, GEM_VARIANT_LABELS, type GemVariant } from '@/lib/utils/gem';

interface GemEvolutionModalProps {
  isOpen: boolean;
  variant: GemVariant;
  /** 진화 전 단계 (0-3) */
  fromStage: number;
  /** 진화 후 단계 (1-4) */
  toStage: number;
  conceptTitle: string;
  xpEarned: number;
  onClose: () => void;
}

export function GemEvolutionModal({
  isOpen,
  variant,
  fromStage,
  toStage,
  conceptTitle,
  xpEarned,
  onClose,
}: GemEvolutionModalProps) {
  const gemName = GEM_VARIANT_LABELS[variant];
  const isComplete = toStage === 4;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="bg-white rounded-sm p-10 text-center shadow-2xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 보석 진화 애니메이션 */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0.3, scale: 0.7 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <GemStone variant={variant} stage={fromStage} size="md" />
              </motion.div>

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-2xl text-slate-300"
              >
                →
              </motion.span>

              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: 'spring', damping: 12, stiffness: 200 }}
              >
                <GemStone variant={variant} stage={toStage} size="lg" showLabel />
              </motion.div>
            </div>

            {/* 텍스트 */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-xl font-black text-text-primary mb-1"
            >
              {isComplete ? '보석 완성!' : '보석이 성장했어요!'}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm text-text-secondary mb-1"
            >
              {conceptTitle}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-sm text-text-secondary mb-4"
            >
              {gemName}: {GEM_STAGE_LABELS[fromStage]} → {GEM_STAGE_LABELS[toStage]}
            </motion.p>

            {xpEarned > 0 && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.0, type: 'spring' }}
                className="text-2xl font-black bg-gradient-to-r from-xp-gold to-amber-500 bg-clip-text text-transparent mb-4"
              >
                +{xpEarned} XP
              </motion.p>
            )}

            {/* 반짝임 파티클 (완성 시) */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="absolute inset-0 pointer-events-none overflow-hidden rounded-sm"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: i % 2 === 0 ? '#FCD34D' : '#C4B5FD',
                      left: `${15 + (i * 10)}%`,
                      top: `${20 + ((i * 17) % 60)}%`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                      y: [0, -20, -40],
                    }}
                    transition={{
                      delay: 0.8 + i * 0.1,
                      duration: 1.2,
                      repeat: Infinity,
                      repeatDelay: 1.5,
                    }}
                  />
                ))}
              </motion.div>
            )}

            <Button onClick={onClose} className="w-full">확인</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
