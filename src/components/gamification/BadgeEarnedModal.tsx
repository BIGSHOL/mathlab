'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Calculator, BookOpen, Zap, Trophy, Star, Crown, Swords,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BadgeInfo {
  label: string;
  description: string;
  icon: string;
  color: string;
}

interface BadgeEarnedModalProps {
  isOpen: boolean;
  badges: BadgeInfo[];
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame, Calculator, BookOpen, Zap, Trophy, Star, Crown, Swords,
};

const COLOR_MAP: Record<string, string> = {
  orange: 'from-orange-400 to-orange-600',
  red: 'from-red-400 to-red-600',
  blue: 'from-blue-400 to-blue-600',
  purple: 'from-purple-400 to-purple-600',
  green: 'from-green-400 to-green-600',
  yellow: 'from-yellow-400 to-yellow-600',
  amber: 'from-amber-400 to-amber-600',
  gold: 'from-amber-400 to-amber-600',
};

export function BadgeEarnedModal({ isOpen, badges, onClose }: BadgeEarnedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && badges.length > 0 && (
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
            className="bg-white rounded-sm p-8 text-center shadow-2xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-black text-text-primary mb-4">배지 획득!</h2>
            <div className="space-y-4 mb-6">
              {badges.map((badge, i) => {
                const Icon = ICON_MAP[badge.icon] ?? Star;
                const gradient = COLOR_MAP[badge.color] ?? 'from-slate-400 to-slate-600';
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2 + i * 0.15, type: 'spring' }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <p className="font-bold text-text-primary">{badge.label}</p>
                    <p className="text-xs text-text-secondary">{badge.description}</p>
                  </motion.div>
                );
              })}
            </div>
            <Button onClick={onClose} className="w-full">확인</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
