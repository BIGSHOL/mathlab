/**
 * 일일 가차/룰렛 서비스.
 * - 학생당 하루 1회
 * - 서버사이드 롤 (클라이언트는 결과만 애니메이션)
 * - 리워드 분포: 40/25/15/10/7/3%
 */
import { prisma } from '@/lib/db';
import { awardXp } from '@/lib/utils/xp';

interface RouletteReward {
  type: RouletteRewardType;
  label: string;
  weight: number;
  xp: number;
}

export type RouletteRewardType =
  | 'xp_small'
  | 'xp_medium'
  | 'xp_large'
  | 'streak_freeze'
  | 'badge_shard'
  | 'jackpot';

export const ROULETTE_REWARDS: RouletteReward[] = [
  { type: 'xp_small',      label: 'XP +10',              weight: 40, xp: 10 },
  { type: 'xp_medium',     label: 'XP +30',              weight: 25, xp: 30 },
  { type: 'xp_large',      label: 'XP +50',              weight: 15, xp: 50 },
  { type: 'streak_freeze', label: '스트릭 프리즈 +1',     weight: 10, xp: 0 },
  { type: 'badge_shard',   label: '뱃지 샤드 +1',         weight: 7,  xp: 0 },
  { type: 'jackpot',       label: '🎰 JACKPOT! XP +100', weight: 3,  xp: 100 },
];

export interface RouletteResult {
  type: RouletteRewardType;
  label: string;
  xp: number;
  /** 이미 오늘 돌렸다면 true */
  alreadyDone: boolean;
}

/** KST 기준 오늘 */
function todayKST(): Date {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

/** 오늘의 결과 조회 (없으면 null) */
export async function getTodayRoulette(studentId: string): Promise<RouletteResult | null> {
  const today = todayKST();
  const existing = await prisma.dailyRoulette.findUnique({
    where: { studentId_date: { studentId, date: today } },
  });
  if (!existing) return null;

  const reward = ROULETTE_REWARDS.find((r) => r.type === existing.rewardType);
  return {
    type: existing.rewardType as RouletteRewardType,
    label: reward?.label ?? existing.rewardType,
    xp: existing.rewardValue,
    alreadyDone: true,
  };
}

/** 스핀 실행 — 오늘 이미 돌렸으면 기존 결과 반환 */
export async function spinRoulette(studentId: string): Promise<RouletteResult> {
  const today = todayKST();

  // 이미 돌렸는지 확인
  const existing = await prisma.dailyRoulette.findUnique({
    where: { studentId_date: { studentId, date: today } },
  });
  if (existing) {
    const reward = ROULETTE_REWARDS.find((r) => r.type === existing.rewardType);
    return {
      type: existing.rewardType as RouletteRewardType,
      label: reward?.label ?? existing.rewardType,
      xp: existing.rewardValue,
      alreadyDone: true,
    };
  }

  // 확률 롤
  const totalWeight = ROULETTE_REWARDS.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * totalWeight;
  let picked = ROULETTE_REWARDS[0];
  for (const reward of ROULETTE_REWARDS) {
    if (roll < reward.weight) {
      picked = reward;
      break;
    }
    roll -= reward.weight;
  }

  // 리워드 지급 (트랜잭션)
  await prisma.$transaction(async (tx) => {
    await tx.dailyRoulette.create({
      data: {
        studentId,
        date: today,
        rewardType: picked.type,
        rewardValue: picked.xp,
        rewardMeta: { label: picked.label },
      },
    });

    if (picked.xp > 0) {
      await awardXp(tx, studentId, picked.xp, 'DAILY_ROULETTE', picked.type);
    }

    if (picked.type === 'streak_freeze') {
      await tx.studentProfile.update({
        where: { userId: studentId },
        data: { streakFreezeCount: { increment: 1 } },
      });
    }

    if (picked.type === 'badge_shard') {
      await tx.studentProfile.update({
        where: { userId: studentId },
        data: { badgeShards: { increment: 1 } },
      });
    }
  });

  return {
    type: picked.type,
    label: picked.label,
    xp: picked.xp,
    alreadyDone: false,
  };
}
