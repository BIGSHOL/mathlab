import { prisma } from '@/lib/db';
import {
  countEarnsAtHoursKST,
  countWeekendActiveDays,
  hasMarathonDay,
  hasHighRevealDay,
  hasLoneQuizCorrect,
  checkAndRecordRanking,
} from './badge-helpers';

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
    try {
      const met = await checkCondition(userId, condition);
      if (met) {
        await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
        newBadgeIds.push(badge.id);
      }
    } catch (e) {
      // 개별 뱃지 체크 실패가 전체 체크를 중단시키지 않도록
      console.error(`[badge-checker] ${badge.id} 체크 실패:`, e);
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

    // ── 백지쓰기 완벽 통과 ── (FIX: BlankAttempt 기반)
    case 'blank_perfect': {
      // BLANK_FULL 단계에서 첫 시도에 전부 맞춘 개념 수 카운트
      const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT "conceptId")::bigint as cnt FROM (
          SELECT DISTINCT ON ("conceptId")
            "conceptId", "allCorrect", "createdAt"
          FROM "BlankAttempt"
          WHERE "studentId" = ${userId}
            AND stage = 'BLANK_FULL'
          ORDER BY "conceptId", "createdAt" ASC
        ) first_attempts
        WHERE "allCorrect" = true
      `;
      return Number(rows[0]?.cnt ?? 0) >= getThreshold(condition, 'value', 'count');
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

    // ── 복수전 성공 ── (FIX: 정답 문제 수로 변경)
    case 'revenge_success':
    case 'revenge': {
      const count = await prisma.revengeAnswer.count({
        where: { isCorrect: true, attempt: { studentId: userId } },
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

    // ── 망각 곡선 복습 완료 (NEW) ──
    case 'forgetting': {
      const count = await prisma.reviewSchedule.count({
        where: { studentId: userId, status: 'completed' },
      });
      return count >= getThreshold(condition, 'value', 'count');
    }

    // ── 메모 작성 (NEW) ──
    case 'memo': {
      const count = await prisma.conceptMemo.count({ where: { userId } });
      return count >= getThreshold(condition, 'value', 'count');
    }

    // ── 진단 완료 (NEW) ──
    case 'diagnostic': {
      const count = await prisma.diagnosticResult.count({ where: { studentId: userId } });
      return count >= getThreshold(condition, 'value', 'count');
    }

    // ── 퀴즈 우승 (NEW) ──
    case 'quiz_win': {
      const count = await prisma.quizParticipant.count({
        where: { studentId: userId, rank: 1 },
      });
      return count >= getThreshold(condition, 'value', 'count');
    }

    // ── 랭킹 1위 (NEW) ──
    case 'ranking': {
      return await checkAndRecordRanking(userId);
    }

    // ── 숙제 스트릭 (NEW) ──
    case 'homework_streak': {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { homeworkStreak: true },
      });
      return (profile?.homeworkStreak ?? 0) >= getThreshold(condition, 'value', 'days');
    }

    // ── 히든: 올빼미족 (0~3시 KST) ──
    case 'hidden_owl': {
      const hits = await countEarnsAtHoursKST(userId, [0, 1, 2, 3]);
      return hits >= 1;
    }

    // ── 얼리버드 (6~7시 KST) ──
    case 'earlybird': {
      const hits = await countEarnsAtHoursKST(userId, [6, 7]);
      return hits >= 1;
    }

    // ── 주말 학습 (토/일 + 일별 ≥ 50XP) ──
    case 'weekend': {
      const days = await countWeekendActiveDays(userId, 50);
      return days >= getThreshold(condition, 'value', 'count');
    }

    // ── 마라톤 (하루 5시간+) ──
    case 'hidden_marathon': {
      return await hasMarathonDay(userId, 5);
    }

    // ── 답 보기 50회 (하루) ──
    case 'hidden_answer': {
      return await hasHighRevealDay(userId, 50);
    }

    // ── 퀴즈 혼자 정답 ──
    case 'hidden_quiz': {
      return await hasLoneQuizCorrect(userId);
    }

    // ── 시스템 에러 발견 (클라이언트 트리거) ──
    case 'hidden_error':
      return false; // /api/badges/award-hidden 에서 직접 수여

    default:
      return false;
  }
}
