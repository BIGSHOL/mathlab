import { prisma } from '@/lib/db';

interface BadgeCondition {
  type: string;
  [key: string]: unknown;
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

/** value 또는 개별 필드에서 숫자를 추출하는 헬퍼 */
function getThreshold(condition: BadgeCondition, ...keys: string[]): number {
  for (const key of keys) {
    if (typeof condition[key] === 'number') return condition[key] as number;
  }
  return 0;
}

async function checkCondition(userId: string, condition: BadgeCondition): Promise<boolean> {
  switch (condition.type) {
    // ── 스트릭 (streak) ──
    case 'streak': {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { longestStreak: true },
      });
      return (profile?.longestStreak ?? 0) >= getThreshold(condition, 'value', 'days');
    }

    // ── 연산 문제 (arithmetic / arithmetic_total) ──
    case 'arithmetic':
    case 'arithmetic_total': {
      const count = await prisma.arithmeticAnswer.count({
        where: { attempt: { studentId: userId }, isCorrect: true },
      });
      return count >= getThreshold(condition, 'value', 'count');
    }

    // ── 개념 완료 (blank / concept_complete) ──
    case 'blank':
    case 'concept_complete': {
      const count = await prisma.learningProgress.groupBy({
        by: ['conceptId'],
        where: { userId, stage: 'BLANK_FULL', completed: true },
      });
      return count.length >= getThreshold(condition, 'value', 'count');
    }

    // ── 백지쓰기 완벽 통과 ──
    case 'blank_perfect': {
      // 오답 없이 한 번에 통과 (attempts === 1이고 completed)
      const count = await prisma.learningProgress.count({
        where: { userId, stage: 'BLANK_FULL', completed: true, attempts: 1 },
      });
      return count >= getThreshold(condition, 'value', 'count');
    }

    // ── 타임어택 (timeattack / time_attack_record) ──
    case 'timeattack':
    case 'time_attack_record': {
      const best = await prisma.timeAttackRecord.findFirst({
        where: { studentId: userId },
        orderBy: { correctCount: 'desc' },
        select: { correctCount: true },
      });
      return (best?.correctCount ?? 0) >= getThreshold(condition, 'value', 'count');
    }

    // ── 퀴즈 참가 (quiz_participate) ──
    case 'quiz_participate': {
      const count = await prisma.quizParticipant.count({
        where: { studentId: userId },
      });
      return count >= getThreshold(condition, 'value', 'count');
    }

    // ── XP 총량 (xp_total) ──
    case 'xp_total': {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { totalXp: true },
      });
      return (profile?.totalXp ?? 0) >= getThreshold(condition, 'value', 'amount');
    }

    // ── 시험 만점 (test_perfect / test_100) ──
    case 'test_perfect':
    case 'test_100': {
      const perfectTests = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "TestAttempt"
        WHERE "studentId" = ${userId}
          AND "completedAt" IS NOT NULL
          AND "correctCount" = "totalCount"
          AND "totalCount" > 0
      `;
      return Number(perfectTests[0]?.count ?? 0) >= getThreshold(condition, 'value', 'count');
    }

    // ── 복수전 성공 (revenge_success / revenge) ──
    case 'revenge_success':
    case 'revenge': {
      const count = await prisma.pointTransaction.count({
        where: { userId, reason: 'REVENGE' },
      });
      return count >= getThreshold(condition, 'value', 'count');
    }

    // ── 레벨 달성 (level) ──
    case 'level': {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { level: true },
      });
      return (profile?.level ?? 0) >= getThreshold(condition, 'value');
    }

    // ── 점수 향상 (recovery) ──
    case 'recovery': {
      // 가장 최근 2개의 시험 결과 비교
      const attempts = await prisma.testAttempt.findMany({
        where: { studentId: userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 2,
        select: { score: true },
      });
      if (attempts.length < 2) return false;
      const improvement = (attempts[0].score ?? 0) - (attempts[1].score ?? 0);
      return improvement >= getThreshold(condition, 'value');
    }

    // ── 히든/시간 기반 업적: 서버에서 자동 체크 불가, 클라이언트 이벤트로 수여 ──
    case 'hidden_owl':
    case 'hidden_error':
    case 'hidden_marathon':
    case 'hidden_answer':
    case 'hidden_quiz':
    case 'earlybird':
    case 'weekend':
      return false; // 별도 이벤트 트리거로 수여

    default:
      return false;
  }
}
