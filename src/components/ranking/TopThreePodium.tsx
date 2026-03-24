'use client';

import Image from 'next/image';
import { Crown, Medal, Star, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { RankChangeIndicator } from './RankChangeIndicator';
import type { RankingEntry } from './types';

interface TopThreePodiumProps {
  top3: RankingEntry[];
}

// 화면 배치 순서: 2위 — 1위 — 3위
const podiumOrder = [1, 0, 2];

// 위로 올라가는 정도 (padding-top 차이로 순위 표현)
const podiumConfig = [
  {
    // 1위 — 금 (가장 높은 받침대)
    liftClass: '',
    avatarSize: 'w-16 h-16 sm:w-20 sm:h-20',
    avatarText: 'text-xl sm:text-2xl',
    avatarBg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    avatarRing: 'ring-4 ring-yellow-300/60 shadow-lg shadow-yellow-200/40',
    nameSize: 'text-sm sm:text-base',
    icon: <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-500" />,
    iconAnimate: 'animate-rank-crown-bounce',
    pedestal: 'bg-gradient-to-t from-yellow-400 to-yellow-300',
    pedestalHeight: 'h-24 sm:h-28',
  },
  {
    // 2위 — 은
    liftClass: '',
    avatarSize: 'w-14 h-14 sm:w-16 sm:h-16',
    avatarText: 'text-lg sm:text-xl',
    avatarBg: 'bg-gradient-to-br from-slate-300 to-slate-400',
    avatarRing: 'ring-3 ring-slate-200/60 shadow-md',
    nameSize: 'text-xs sm:text-sm',
    icon: <Medal className="w-5 h-5 text-slate-400" />,
    iconAnimate: '',
    pedestal: 'bg-gradient-to-t from-slate-300 to-slate-200',
    pedestalHeight: 'h-16 sm:h-20',
  },
  {
    // 3위 — 동
    liftClass: '',
    avatarSize: 'w-14 h-14 sm:w-16 sm:h-16',
    avatarText: 'text-lg sm:text-xl',
    avatarBg: 'bg-gradient-to-br from-amber-500 to-amber-700',
    avatarRing: 'ring-3 ring-amber-300/50 shadow-md',
    nameSize: 'text-xs sm:text-sm',
    icon: <Medal className="w-5 h-5 text-amber-600" />,
    iconAnimate: '',
    pedestal: 'bg-gradient-to-t from-amber-500 to-amber-400',
    pedestalHeight: 'h-12 sm:h-14',
  },
];

const entranceVariants = {
  hidden: (displayIdx: number) => ({
    opacity: 0,
    y: displayIdx === 1 ? -30 : 20,
    x: displayIdx === 0 ? -20 : displayIdx === 2 ? 20 : 0,
    scale: 0.8,
  }),
  visible: (displayIdx: number) => ({
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: {
      delay: displayIdx === 1 ? 0.1 : displayIdx === 0 ? 0.25 : 0.35,
      type: 'spring' as const,
      damping: 14,
      stiffness: 180,
    },
  }),
};

export function TopThreePodium({ top3 }: TopThreePodiumProps) {
  if (top3.length < 3) return null;

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 mb-8">
      {podiumOrder.map((rankIdx, displayIdx) => {
        const student = top3[rankIdx];
        const config = podiumConfig[rankIdx];

        return (
          <motion.div
            key={student.userId}
            custom={displayIdx}
            variants={entranceVariants}
            initial="hidden"
            animate="visible"
            className={`flex flex-col items-center flex-1 max-w-[180px] ${config.liftClass}`}
          >
            {/* 아이콘 */}
            <div className={`mb-1 ${config.iconAnimate}`}>
              {config.icon}
            </div>

            {/* 아바타 */}
            {student.badgeIcon ? (
              <div className={`${config.avatarSize} ${config.avatarRing} rounded-full overflow-hidden relative mb-1.5`}>
                <Image src={student.badgeIcon} alt={`${student.name} 대표 배지`} fill sizes="80px" className="object-cover scale-[1.15]" />
              </div>
            ) : (
              <div className={`${config.avatarSize} ${config.avatarBg} ${config.avatarRing} rounded-full flex items-center justify-center text-white font-bold ${config.avatarText} mb-1.5`}>
                {student.name[0]}
              </div>
            )}

            {/* 이름 + 정보 */}
            <div className="text-center mb-2 w-full">
              <p className={`font-extrabold text-text-primary ${config.nameSize} truncate`}>
                {student.name}
                {student.isMe && <span className="text-primary ml-0.5 text-[10px]">(나)</span>}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] font-bold text-text-primary">{student.totalXp.toLocaleString()}</span>
                </div>
                {student.currentStreak >= 3 && (
                  <div className="flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="text-[10px] font-bold text-orange-500">{student.currentStreak}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <RankChangeIndicator change={student.rankChange} isNew={student.isNew} size="sm" />
                {student.weeklyXp > 0 && (
                  <span className="text-[10px] text-emerald-600 font-semibold">+{student.weeklyXp}</span>
                )}
              </div>
            </div>

            {/* 받침대 */}
            <div className={`w-full ${config.pedestal} ${config.pedestalHeight} rounded-t-xl flex items-center justify-center`}>
              <span className="text-white font-extrabold text-2xl sm:text-3xl">{rankIdx + 1}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
