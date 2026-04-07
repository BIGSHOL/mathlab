'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, Flame } from 'lucide-react';
import { useGamificationStore, CELEBRATION_COLORS } from '@/stores/gamificationStore';
import { Confetti } from './Confetti';

export function CelebrationOverlay() {
  const celebration = useGamificationStore((s) => s.celebration);
  const dismiss = useGamificationStore((s) => s.dismissCelebration);

  return (
    <AnimatePresence>
      {celebration && (
        <>
          <Confetti
            active
            colors={CELEBRATION_COLORS[celebration.type]}
          />
          <motion.div
            key={celebration.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 cursor-pointer"
            onClick={dismiss}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200 }}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white shadow-2xl max-w-sm mx-4 text-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 아이콘 */}
              <CelebrationIcon celebration={celebration} />

              {/* 타이틀 */}
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {celebration.title}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {celebration.subtitle}
                </p>
              </div>

              {/* 닫기 */}
              <button
                onClick={dismiss}
                className="mt-2 px-6 py-2 rounded-full bg-gradient-to-r from-primary to-blue-600 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-shadow"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CelebrationIcon({ celebration }: { celebration: { type: string; title: string; icon?: string } }) {
  const base = 'w-20 h-20 rounded-full flex items-center justify-center shadow-lg';

  switch (celebration.type) {
    case 'level_up':
      return (
        <motion.div
          className={`${base} bg-gradient-to-br from-amber-400 to-yellow-500`}
          animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className="text-3xl font-black text-white drop-shadow">
            {celebration.title.replace('Level ', 'Lv.')}
          </span>
        </motion.div>
      );

    case 'badge':
      return celebration.icon ? (
        <motion.div
          className={`${base} bg-gradient-to-br from-violet-500 to-purple-600 overflow-hidden`}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={celebration.icon}
            alt=""
            className="w-14 h-14 object-cover rounded-full"
          />
        </motion.div>
      ) : (
        <motion.div
          className={`${base} bg-gradient-to-br from-violet-500 to-purple-600`}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="text-3xl">🏅</span>
        </motion.div>
      );

    case 'test_perfect':
      return (
        <motion.div
          className={`${base} bg-gradient-to-br from-emerald-400 to-green-500`}
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Trophy className="w-10 h-10 text-white drop-shadow" />
        </motion.div>
      );

    case 'streak_milestone':
      return (
        <motion.div
          className={`${base} bg-gradient-to-br from-orange-400 to-red-500`}
          animate={{ scale: [1, 1.2, 1, 1.1, 1] }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Flame className="w-10 h-10 text-white drop-shadow" />
        </motion.div>
      );

    default:
      return null;
  }
}
