'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LevelUpModalProps {
  isOpen: boolean;
  newLevel: number;
  onClose: () => void;
}

export function LevelUpModal({ isOpen, newLevel, onClose }: LevelUpModalProps) {
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
            className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-xp-gold to-amber-500 flex items-center justify-center"
            >
              <Trophy className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-black text-text-primary mb-2">레벨 업!</h2>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="text-5xl font-black bg-gradient-to-r from-xp-gold to-amber-500 bg-clip-text text-transparent mb-4"
            >
              Level {newLevel}
            </motion.p>
            <p className="text-text-secondary mb-6">축하합니다! 새로운 레벨에 도달했습니다!</p>
            <Button onClick={onClose} className="w-full">확인</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
