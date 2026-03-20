import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, getTenantFilter } from '@/lib/api';
import { rankingQuerySchema } from '@/lib/schemas/gamification';

/** KST 기준 이번 주 월요일 00:00 UTC */
function getWeekStart(): Date {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  const day = kst.getUTCDay(); // 0=Sun
  const diffToMon = day === 0 ? 6 : day - 1;
  const monday = new Date(kst);
  monday.setUTCDate(monday.getUTCDate() - diffToMon);
  monday.setUTCHours(0, 0, 0, 0);
  return new Date(monday.getTime() - kstOffset);
}

/** KST 기준 이번 달 1일 00:00 UTC */
function getMonthStart(): Date {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  const firstDay = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1));
  return new Date(firstDay.getTime() - kstOffset);
}

// GET /api/gamification/ranking?limit=50&period=week
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const parsed = rankingQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? '50',
    period: searchParams.get('period') ?? 'week',
  });

  const limit = parsed.success ? parsed.data.limit : 50;
  const period = parsed.success ? parsed.data.period : 'week';

  // 테넌트별 랭킹
  const tenantWhere = getTenantFilter(user);
  const userFilter = Object.keys(tenantWhere).length > 0
    ? { user: { tenantId: tenantWhere.tenantId as string } }
    : {};

  // 1. 현재 순위 (totalXp 내림차순)
  const profiles = await prisma.studentProfile.findMany({
    where: userFilter,
    take: limit,
    orderBy: { totalXp: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  if (profiles.length === 0) {
    return NextResponse.json({ data: { rankings: [], myRank: null } });
  }

  const userIds = profiles.map((p) => p.userId);

  // 2. 기간별 XP 합산
  let periodStart: Date | null = null;
  if (period === 'week') periodStart = getWeekStart();
  else if (period === 'month') periodStart = getMonthStart();

  let periodXpMap = new Map<string, number>();
  let usersWithPriorActivity = new Set<string>();

  if (periodStart) {
    const periodXp = await prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        type: 'EARN',
        createdAt: { gte: periodStart },
      },
      _sum: { amount: true },
    });
    periodXpMap = new Map(periodXp.map((w) => [w.userId, w._sum.amount ?? 0]));

    // 신규 학생 판별: 기간 전에 활동이 있는 학생
    const priorTransactions = await prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        type: 'EARN',
        createdAt: { lt: periodStart },
      },
      _count: { _all: true },
    });
    usersWithPriorActivity = new Set(priorTransactions.map((t) => t.userId));
  }

  // 3. 순위 변동 계산
  const rankings = profiles.map((p, i) => {
    const weeklyXp = periodXpMap.get(p.userId) ?? 0;
    return {
      rank: i + 1,
      userId: p.userId,
      name: p.user.name ?? '이름없음',
      level: p.level,
      totalXp: p.totalXp,
      weeklyXp,
      rankChange: 0,
      currentStreak: p.currentStreak,
      isMe: p.userId === user.id,
      isNew: false,
      previousTotalXp: p.totalXp - weeklyXp,
    };
  });

  if (periodStart) {
    // 이전 XP 기준으로 이전 순위 계산
    const sorted = [...rankings].sort((a, b) => b.previousTotalXp - a.previousTotalXp);
    const prevRankMap = new Map<string, number>();
    sorted.forEach((item, i) => prevRankMap.set(item.userId, i + 1));

    for (const r of rankings) {
      const prevRank = prevRankMap.get(r.userId) ?? r.rank;
      r.rankChange = prevRank - r.rank; // 양수=상승
      r.isNew = !usersWithPriorActivity.has(r.userId) && r.weeklyXp > 0;
    }
  }

  // previousTotalXp 제거 후 응답
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cleanRankings = rankings.map(({ previousTotalXp, ...rest }) => rest);

  // 현재 유저 순위 (목록에 없을 경우)
  const myEntry = cleanRankings.find((r) => r.isMe);
  let myRank = myEntry?.rank ?? null;
  if (!myRank) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (profile) {
      myRank = (await prisma.studentProfile.count({
        where: { ...userFilter, totalXp: { gt: profile.totalXp } },
      })) + 1;
    }
  }

  return NextResponse.json({
    data: { rankings: cleanRankings, myRank },
  });
}
