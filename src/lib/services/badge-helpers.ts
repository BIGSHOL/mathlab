/**
 * 뱃지 체크용 raw SQL 헬퍼 (PostgreSQL).
 * `PointTransaction.createdAt`의 시간대/요일 기반 집계.
 */
import { prisma } from '@/lib/db';

/**
 * 주어진 userId가 특정 시간대(KST)에 EARN 트랜잭션을 남긴 횟수.
 * @param hoursKST 포함시킬 시(hour) 배열 (예: [0,1,2,3])
 */
export async function countEarnsAtHoursKST(userId: string, hoursKST: number[]): Promise<number> {
  if (hoursKST.length === 0) return 0;
  // Postgres DOW: 일(0)~토(6). HOUR 0-23.
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint as count FROM "PointTransaction"
    WHERE "userId" = ${userId}
      AND type = 'EARN'
      AND EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Asia/Seoul') = ANY(${hoursKST}::int[])
  `;
  return Number(rows[0]?.count ?? 0);
}

/**
 * 주말(토/일) 학습 일수 — 일별 XP 합 ≥ minXp 인 주말 날짜 개수.
 */
export async function countWeekendActiveDays(userId: string, minXp: number = 50): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*)::bigint as cnt FROM (
      SELECT DATE("createdAt" AT TIME ZONE 'Asia/Seoul') as d, SUM(amount)::int as total
      FROM "PointTransaction"
      WHERE "userId" = ${userId}
        AND type = 'EARN'
        AND EXTRACT(DOW FROM "createdAt" AT TIME ZONE 'Asia/Seoul') IN (0, 6)
      GROUP BY d
      HAVING SUM(amount) >= ${minXp}
    ) s
  `;
  return Number(rows[0]?.cnt ?? 0);
}

/**
 * 마라톤: 하루에 PointTransaction max-min 시간차 ≥ hours 인 날이 있는지.
 */
export async function hasMarathonDay(userId: string, hours: number = 5): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ span_sec: number }>>`
    SELECT EXTRACT(EPOCH FROM (MAX("createdAt") - MIN("createdAt"))) as span_sec
    FROM "PointTransaction"
    WHERE "userId" = ${userId}
      AND type = 'EARN'
    GROUP BY DATE("createdAt" AT TIME ZONE 'Asia/Seoul')
    HAVING EXTRACT(EPOCH FROM (MAX("createdAt") - MIN("createdAt"))) >= ${hours * 3600}
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * hidden_answer: 하루(KST) 내 RevealLog 50건 이상인 날이 있는지.
 */
export async function hasHighRevealDay(userId: string, threshold: number = 50): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*)::bigint as cnt
    FROM "RevealLog"
    WHERE "userId" = ${userId}
    GROUP BY DATE("createdAt" AT TIME ZONE 'Asia/Seoul')
    HAVING COUNT(*) >= ${threshold}
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * hidden_quiz: 퀴즈에서 "혼자 정답" 경험 1회 이상.
 * 같은 question의 QuizAnswerLog 중 isCorrect=true 인 참가자가 1명이고 그게 나일 때.
 */
export async function hasLoneQuizCorrect(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT qa.id
    FROM "QuizAnswerLog" qa
    JOIN "QuizParticipant" qp ON qp.id = qa."participantId"
    WHERE qa."isCorrect" = true
      AND qp."studentId" = ${userId}
      AND (
        SELECT COUNT(*) FROM "QuizAnswerLog" qb
        JOIN "QuizParticipant" qbp ON qbp.id = qb."participantId"
        WHERE qb."questionId" = qa."questionId"
          AND qbp."sessionId" = qp."sessionId"
          AND qb."isCorrect" = true
      ) = 1
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * 테넌트 내 전체 XP 랭킹 1위인지 확인 후, 최초 달성 시 everRankedFirstAt 설정.
 * @returns 1위 경험이 있으면 true (현재 또는 과거)
 */
export async function checkAndRecordRanking(userId: string): Promise<boolean> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { everRankedFirstAt: true, totalXp: true, user: { select: { tenantId: true } } },
  });
  if (!profile) return false;

  // 이미 1위 경험 있음
  if (profile.everRankedFirstAt) return true;

  // 현재 1위인지 확인 (같은 테넌트 내)
  if (!profile.user.tenantId) return false;

  const top = await prisma.studentProfile.findFirst({
    where: {
      user: { tenantId: profile.user.tenantId, role: 'STUDENT' },
      totalXp: { gt: 0 },
    },
    orderBy: [{ totalXp: 'desc' }, { level: 'desc' }],
    select: { userId: true },
  });

  if (top?.userId === userId) {
    await prisma.studentProfile.update({
      where: { userId },
      data: { everRankedFirstAt: new Date() },
    });
    return true;
  }

  return false;
}
