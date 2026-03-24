import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, getTenantFilter } from '@/lib/api';
import { rankingQuerySchema } from '@/lib/schemas/gamification';
import type { RankingEntry } from '@/components/ranking/types';

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

// GET /api/gamification/ranking?limit=50&period=week&category=xp&scope=tenant
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const parsed = rankingQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? '50',
    period: searchParams.get('period') ?? 'week',
    category: searchParams.get('category') ?? 'xp',
    scope: searchParams.get('scope') ?? 'tenant',
  });

  const limit = parsed.success ? parsed.data.limit : 50;
  const period = parsed.success ? parsed.data.period : 'week';
  const category = parsed.success ? parsed.data.category : 'xp';
  const scope = parsed.success ? parsed.data.scope : 'tenant';

  // 스코프에 따른 테넌트 필터
  const tenantWhere = scope === 'all' ? {} : getTenantFilter(user);
  const userFilter = Object.keys(tenantWhere).length > 0
    ? { user: { tenantId: tenantWhere.tenantId as string } }
    : {};

  if (category === 'gem') {
    return handleGemRanking(user, limit, userFilter);
  }

  return handleXpRanking(user, limit, period, userFilter);
}

// ── XP 랭킹 (기존 로직) ──
async function handleXpRanking(
  user: { id: string },
  limit: number,
  period: string,
  userFilter: Record<string, unknown>,
) {
  const profiles = await prisma.studentProfile.findMany({
    where: userFilter,
    take: limit,
    orderBy: { totalXp: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      representativeBadge: { select: { icon: true } },
    },
  });

  if (profiles.length === 0) {
    return NextResponse.json({ data: { rankings: [], myRank: null } });
  }

  const userIds = profiles.map((p) => p.userId);

  // 기간별 XP 합산
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

  // 순위 변동 계산
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
      badgeIcon: p.representativeBadge?.icon ?? null,
      previousTotalXp: p.totalXp - weeklyXp,
    };
  });

  if (periodStart) {
    const sorted = [...rankings].sort((a, b) => b.previousTotalXp - a.previousTotalXp);
    const prevRankMap = new Map<string, number>();
    sorted.forEach((item, i) => prevRankMap.set(item.userId, i + 1));

    for (const r of rankings) {
      const prevRank = prevRankMap.get(r.userId) ?? r.rank;
      r.rankChange = prevRank - r.rank;
      r.isNew = !usersWithPriorActivity.has(r.userId) && r.weeklyXp > 0;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cleanRankings = rankings.map(({ previousTotalXp, ...rest }) => rest);

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

  return NextResponse.json({ data: { rankings: cleanRankings, myRank } });
}

// ── 보석 랭킹 ──
async function handleGemRanking(
  user: { id: string },
  limit: number,
  userFilter: Record<string, unknown>,
) {
  // BLANK_FULL 완료 = 보석 완성 (stage 4). 개념별 유니크 카운트
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (userFilter as any)?.user?.tenantId;

  const gemCounts = await prisma.learningProgress.groupBy({
    by: ['userId'],
    where: {
      stage: 'BLANK_FULL',
      completed: true,
      ...(tenantId ? { user: { tenantId } } : {}),
    },
    _count: { conceptId: true },
  });

  // 완성 보석 수 기준 내림차순 정렬
  const sorted = gemCounts
    .map((g) => ({ userId: g.userId, completedGems: g._count.conceptId }))
    .sort((a, b) => b.completedGems - a.completedGems)
    .slice(0, limit);

  if (sorted.length === 0) {
    return NextResponse.json({ data: { rankings: [], myRank: null } });
  }

  const userIds = sorted.map((s) => s.userId);

  // 프로필 정보 조인
  const profiles = await prisma.studentProfile.findMany({
    where: { userId: { in: userIds } },
    include: {
      user: { select: { id: true, name: true } },
      representativeBadge: { select: { icon: true } },
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  const rankings: RankingEntry[] = sorted.map((s, i) => {
    const p = profileMap.get(s.userId);
    return {
      rank: i + 1,
      userId: s.userId,
      name: p?.user.name ?? '이름없음',
      level: p?.level ?? 1,
      totalXp: p?.totalXp ?? 0,
      weeklyXp: 0,
      rankChange: 0,
      currentStreak: p?.currentStreak ?? 0,
      isMe: s.userId === user.id,
      isNew: false,
      badgeIcon: p?.representativeBadge?.icon ?? null,
      completedGems: s.completedGems,
    };
  });

  const myEntry = rankings.find((r) => r.isMe);
  let myRank = myEntry?.rank ?? null;
  if (!myRank) {
    // 내 보석 수 계산
    const myGems = await prisma.learningProgress.count({
      where: { userId: user.id, stage: 'BLANK_FULL', completed: true },
    });
    if (myGems > 0) {
      myRank = (await prisma.learningProgress.groupBy({
        by: ['userId'],
        where: {
          stage: 'BLANK_FULL',
          completed: true,
          ...(tenantId ? { user: { tenantId } } : {}),
        },
        _count: { conceptId: true },
        having: { conceptId: { _count: { gt: myGems } } },
      })).length + 1;
    }
  }

  return NextResponse.json({ data: { rankings, myRank } });
}
