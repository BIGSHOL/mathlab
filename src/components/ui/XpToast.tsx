'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useXpNotification } from '@/stores/xp-notification';

/** XP 획득 시 플로팅 알림 컨테이너 — 학생 레이아웃에 배치 */
export function XpToastContainer() {
  const notifications = useXpNotification((s) => s.notifications);

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9997] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-bold text-sm shadow-lg shadow-amber-200/50"
          >
            <Star className="w-4 h-4 fill-white" />
            +{n.amount} XP
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
