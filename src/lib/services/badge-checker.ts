import { prisma } from '@/lib/db';

interface BadgeCondition {
  type: string;
  [key: string]: unknown;
}

/** 배지 초기 시드 데이터 */
export const BADGE_SEEDS = [
  { key: 'streak_7', label: '7일 연속 학습', description: '7일 연속으로 학습한 학생', icon: 'Flame', color: 'orange', condition: { type: 'streak', days: 7 }, sortOrder: 1 },
  { key: 'streak_30', label: '30일 연속 학습', description: '30일 연속으로 학습한 학생', icon: 'Flame', color: 'red', condition: { type: 'streak', days: 30 }, sortOrder: 2 },
  { key: 'arithmetic_100', label: '연산 100문제', description: '연산 문제를 100개 풀었습니다', icon: 'Calculator', color: 'blue', condition: { type: 'arithmetic_total', count: 100 }, sortOrder: 3 },
  { key: 'arithmetic_1000', label: '연산 1000문제', description: '연산 문제를 1000개 풀었습니다', icon: 'Calculator', color: 'purple', condition: { type: 'arithmetic_total', count: 1000 }, sortOrder: 4 },
  { key: 'concept_master_10', label: '개념 10개 마스터', description: '10개 개념을 완전히 학습했습니다', icon: 'BookOpen', color: 'green', condition: { type: 'concept_complete', count: 10 }, sortOrder: 5 },
  { key: 'time_attack_20', label: '타임어택 20개', description: '타임어택에서 20개 이상 정답', icon: 'Zap', color: 'yellow', condition: { type: 'time_attack_record', count: 20 }, sortOrder: 6 },
  { key: 'first_quiz', label: '첫 퀴즈 참가', description: '실시간 퀴즈에 처음 참가했습니다', icon: 'Trophy', color: 'amber', condition: { type: 'quiz_participate', count: 1 }, sortOrder: 7 },
  { key: 'xp_1000', label: '1000 XP 달성', description: '총 1000 XP를 모았습니다', icon: 'Star', color: 'gold', condition: { type: 'xp_total', amount: 1000 }, sortOrder: 8 },
  { key: 'perfect_score', label: '만점왕', description: '시험에서 만점을 받았습니다', icon: 'Crown', color: 'gold', condition: { type: 'test_perfect', count: 1 }, sortOrder: 9 },
  { key: 'revenge_win', label: '복수 성공', description: '복수전에서 승리했습니다', icon: 'Swords', color: 'red', condition: { type: 'revenge_success', count: 1 }, sortOrder: 10 },
];

/** 배지 시드 (없는 것만 추가) */
export async function seedBadges() {
  for (const seed of BADGE_SEEDS) {
    await prisma.badge.upsert({
      where: { key: seed.key },
      update: {},
      create: seed,
    });
  }
}

/** 배지 조건 체크 → 신규 배지 반환 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const badges = await prisma.badge.findMany();
  const existing = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  });
  const existingIds = new Set(existing.map((e) => e.badgeId));

  const newBadgeIds: string[] = [];

  for (const badge of badges) {
    if (existingIds.has(badge.id)) continue;

    const condition = badge.condition as BadgeCondition;
    const met = await checkCondition(userId, condition);

    if (met) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      newBadgeIds.push(badge.id);
    }
  }

  return newBadgeIds;
}

async function checkCondition(userId: string, condition: BadgeCondition): Promise<boolean> {
  switch (condition.type) {
    case 'streak': {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { longestStreak: true },
      });
      return (profile?.longestStreak ?? 0) >= (condition.days as number);
    }
    case 'arithmetic_total': {
      const count = await prisma.arithmeticAnswer.count({
        where: { attempt: { studentId: userId }, isCorrect: true },
      });
      return count >= (condition.count as number);
    }
    case 'concept_complete': {
      const count = await prisma.learningProgress.groupBy({
        by: ['conceptId'],
        where: { userId, stage: 'BLANK_FULL', completed: true },
      });
      return count.length >= (condition.count as number);
    }
    case 'time_attack_record': {
      const best = await prisma.timeAttackRecord.findFirst({
        where: { studentId: userId },
        orderBy: { correctCount: 'desc' },
        select: { correctCount: true },
      });
      return (best?.correctCount ?? 0) >= (condition.count as number);
    }
    case 'quiz_participate': {
      const count = await prisma.quizParticipant.count({
        where: { studentId: userId },
      });
      return count >= (condition.count as number);
    }
    case 'xp_total': {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { totalXp: true },
      });
      return (profile?.totalXp ?? 0) >= (condition.amount as number);
    }
    case 'test_perfect': {
      const perfectTests = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "TestAttempt"
        WHERE "studentId" = ${userId}
          AND "completedAt" IS NOT NULL
          AND "correctCount" = "totalCount"
          AND "totalCount" > 0
      `;
      return Number(perfectTests[0]?.count ?? 0) >= (condition.count as number);
    }
    case 'revenge_success': {
      // 복수전 성공 카운트 (PointTransaction reason='REVENGE' 기준)
      const count = await prisma.pointTransaction.count({
        where: { userId, reason: 'REVENGE' },
      });
      return count >= (condition.count as number);
    }
    default:
      return false;
  }
}
