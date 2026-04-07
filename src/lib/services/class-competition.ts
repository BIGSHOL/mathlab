import { prisma } from '@/lib/db';
import { awardXp } from '@/lib/utils/xp';

// ── KST 주간 경계 계산 ──

function getCurrentWeekBounds() {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const now = new Date();
  const kst = new Date(now.getTime() + KST_OFFSET);
  const day = kst.getUTCDay(); // 0=Sun
  const diffToMon = day === 0 ? 6 : day - 1;

  const monday = new Date(kst);
  monday.setUTCDate(monday.getUTCDate() - diffToMon);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return {
    weekStart: new Date(monday.getTime() - KST_OFFSET),
    weekEnd: new Date(sunday.getTime() - KST_OFFSET),
  };
}

function getPreviousWeekBounds() {
  const current = getCurrentWeekBounds();
  return {
    weekStart: new Date(current.weekStart.getTime() - 7 * 24 * 60 * 60 * 1000),
    weekEnd: new Date(current.weekStart.getTime() - 1),
  };
}

// ── 타입 ──

export interface ClassRanking {
  classroomId: string;
  name: string;
  totalXp: number;
  memberCount: number;
  rank: number;
}

// ── 실시간 랭킹 ──

export async function getClassRankings(tenantId: string): Promise<ClassRanking[]> {
  const { weekStart } = getCurrentWeekBounds();

  const classrooms = await prisma.classroom.findMany({
    where: { tenantId },
    select: { id: true, name: true, students: { select: { id: true } } },
  });

  if (classrooms.length < 2) return [];

  const rankings: ClassRanking[] = [];

  for (const cls of classrooms) {
    if (cls.students.length === 0) continue;
    const studentIds = cls.students.map((s) => s.id);

    const xpResult = await prisma.pointTransaction.aggregate({
      where: {
        userId: { in: studentIds },
        type: 'EARN',
        createdAt: { gte: weekStart },
        NOT: { reason: { startsWith: 'CLASS_COMPETITION' } },
      },
      _sum: { amount: true },
    });

    rankings.push({
      classroomId: cls.id,
      name: cls.name,
      totalXp: xpResult._sum.amount ?? 0,
      memberCount: cls.students.length,
      rank: 0,
    });
  }

  rankings.sort((a, b) => b.totalXp - a.totalXp);
  rankings.forEach((r, i) => { r.rank = i + 1; });

  return rankings;
}

// ── 지난주 결과 확정 + 우승 보너스 ──

const WINNER_BONUS_XP = 30;

export async function finalizeWeek(tenantId: string): Promise<void> {
  const { weekStart, weekEnd } = getPreviousWeekBounds();

  const existing = await prisma.classCompetitionWeek.findUnique({
    where: { tenantId_weekStart: { tenantId, weekStart } },
  });
  if (existing?.bonusAwarded) return;

  const classrooms = await prisma.classroom.findMany({
    where: { tenantId },
    select: { id: true, name: true, students: { select: { id: true } } },
  });

  const results: ClassRanking[] = [];
  for (const cls of classrooms) {
    if (cls.students.length === 0) continue;
    const studentIds = cls.students.map((s) => s.id);

    const xpResult = await prisma.pointTransaction.aggregate({
      where: {
        userId: { in: studentIds },
        type: 'EARN',
        createdAt: { gte: weekStart, lte: weekEnd },
        NOT: { reason: { startsWith: 'CLASS_COMPETITION' } },
      },
      _sum: { amount: true },
    });

    results.push({
      classroomId: cls.id,
      name: cls.name,
      totalXp: xpResult._sum.amount ?? 0,
      memberCount: cls.students.length,
      rank: 0,
    });
  }

  results.sort((a, b) => b.totalXp - a.totalXp);
  results.forEach((r, i) => { r.rank = i + 1; });

  const winner = results[0];
  if (!winner || winner.totalXp === 0) {
    await prisma.classCompetitionWeek.upsert({
      where: { tenantId_weekStart: { tenantId, weekStart } },
      update: { results: JSON.parse(JSON.stringify(results)), bonusAwarded: true },
      create: { tenantId, weekStart, weekEnd, results: JSON.parse(JSON.stringify(results)), bonusAwarded: true },
    });
    return;
  }

  // 우승반 보너스 XP 지급
  const winnerStudents = classrooms.find((c) => c.id === winner.classroomId)?.students ?? [];

  await prisma.$transaction(async (tx) => {
    for (const student of winnerStudents) {
      await awardXp(tx, student.id, WINNER_BONUS_XP, 'CLASS_COMPETITION_WIN');
    }
  });

  await prisma.classCompetitionWeek.upsert({
    where: { tenantId_weekStart: { tenantId, weekStart } },
    update: {
      results: JSON.parse(JSON.stringify(results)),
      winnerId: winner.classroomId,
      bonusAwarded: true,
    },
    create: {
      tenantId,
      weekStart,
      weekEnd,
      results: JSON.parse(JSON.stringify(results)),
      winnerId: winner.classroomId,
      bonusAwarded: true,
    },
  });
}
