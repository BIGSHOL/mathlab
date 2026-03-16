'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LevelUpModalProps {
  isOpen: boolean;
  newLevel: number;
  onClose: () => void;
}

const PARTICLE_COLORS = ['#EAB308', '#3B82F6', '#EF4444', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];

export function LevelUpModal({ isOpen, newLevel, onClose }: LevelUpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="bg-white rounded-sm p-10 text-center shadow-2xl max-w-sm mx-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 방사형 광선 배경 */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 0.15, rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-20"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0%, #EAB308 5%, transparent 10%, transparent 20%, #3B82F6 25%, transparent 30%, transparent 40%, #EF4444 45%, transparent 50%, transparent 60%, #10B981 65%, transparent 70%, transparent 80%, #F97316 85%, transparent 90%)',
                }}
              />
            </div>

            {/* 방사형 컬러 파티클 */}
            {PARTICLE_COLORS.map((color, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const radius = 120;
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 1.2, ease: 'easeOut' }}
                  className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full -ml-1.5 -mt-1.5 pointer-events-none"
                  style={{ background: color }}
                />
              );
            })}

            {/* 떨어지는 confetti */}
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={`confetti-${i}`}
                initial={{ y: -20, x: -100 + Math.random() * 200, opacity: 0, rotate: 0 }}
                animate={{
                  y: 300,
                  opacity: [0, 1, 1, 0],
                  rotate: 360 + Math.random() * 360,
                }}
                transition={{ delay: 0.5 + i * 0.08, duration: 1.5, ease: 'easeIn' }}
                className="absolute top-0 left-1/2 w-2 h-2 pointer-events-none"
                style={{
                  background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                  borderRadius: i % 2 === 0 ? '50%' : '2px',
                }}
              />
            ))}

            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-xp-gold via-amber-400 to-orange-500 flex items-center justify-center shadow-lg relative z-10"
            >
              <Trophy className="w-12 h-12 text-white drop-shadow-md" />
            </motion.div>

            <h2 className="text-2xl font-black text-text-primary mb-2 relative z-10">레벨 업!</h2>

            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.4, duration: 0.6, type: 'spring', stiffness: 300 }}
              className="text-6xl font-black bg-gradient-to-r from-xp-gold via-amber-400 to-orange-500 bg-clip-text text-transparent mb-4 relative z-10"
            >
              Level {newLevel}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-text-secondary mb-6 relative z-10"
            >
              축하합니다! 새로운 레벨에 도달했습니다!
            </motion.p>

            <Button onClick={onClose} className="w-full relative z-10">확인</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
