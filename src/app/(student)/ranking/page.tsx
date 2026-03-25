import { Trophy } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { getCurrentUser } from '@/lib/auth';
import { getViewAsUser } from '@/lib/view-as';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { RankingContent } from '@/components/ranking/RankingContent';
import type { RankingEntry } from '@/components/ranking/types';
import { getTenantFilter } from '@/lib/api/tenant-scope';

/** KST 기준 이번 주 월요일 00:00 UTC */
function getWeekStart(): Date {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  const day = kst.getUTCDay();
  const diffToMon = day === 0 ? 6 : day - 1;
  const monday = new Date(kst);
  monday.setUTCDate(monday.getUTCDate() - diffToMon);
  monday.setUTCHours(0, 0, 0, 0);
  return new Date(monday.getTime() - kstOffset);
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ _as?: string }>;
}) {
  const realUser = await getCurrentUser();
  if (!realUser) redirect('/login');
  const user = await getViewAsUser(await searchParams) ?? realUser;

  // 테넌트 필터 (SSR 기본: tenant 스코프)
  const tenantWhere = getTenantFilter(user);
  const tenantUserFilter = Object.keys(tenantWhere).length > 0
    ? { user: { tenantId: tenantWhere.tenantId as string } }
    : {};

  // ── XP 랭킹 (SSR 기본 데이터) ──
  const profiles = await prisma.studentProfile.findMany({
    where: tenantUserFilter,
    orderBy: { totalXp: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, name: true } },
      representativeBadge: { select: { icon: true } },
    },
  });

  const userIds = profiles.map((p) => p.userId);

  const weekStart = getWeekStart();
  const weeklyXpData = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, type: 'EARN', createdAt: { gte: weekStart } },
    _sum: { amount: true },
  });
  const weeklyMap = new Map(weeklyXpData.map((w) => [w.userId, w._sum.amount ?? 0]));

  const priorActivity = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, type: 'EARN', createdAt: { lt: weekStart } },
    _count: { _all: true },
  });
  const usersWithPrior = new Set(priorActivity.map((t) => t.userId));

  const xpRankings: RankingEntry[] = profiles.map((p, i) => {
    const weeklyXp = weeklyMap.get(p.userId) ?? 0;
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
      isNew: !usersWithPrior.has(p.userId) && weeklyXp > 0,
      badgeIcon: p.representativeBadge?.icon ?? null,
    };
  });

  // 순위 변동 계산
  const withPrev = xpRankings.map((r) => ({ ...r, previousTotalXp: r.totalXp - r.weeklyXp }));
  const prevSorted = [...withPrev].sort((a, b) => b.previousTotalXp - a.previousTotalXp);
  const prevRankMap = new Map<string, number>();
  prevSorted.forEach((item, i) => prevRankMap.set(item.userId, i + 1));
  for (const r of xpRankings) {
    const prevRank = prevRankMap.get(r.userId) ?? r.rank;
    r.rankChange = prevRank - r.rank;
  }

  const myXpEntry = xpRankings.find((r) => r.isMe);
  let myXpRank = myXpEntry?.rank ?? null;
  if (!myXpRank) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (profile) {
      myXpRank = (await prisma.studentProfile.count({
        where: { ...tenantUserFilter, totalXp: { gt: profile.totalXp } },
      })) + 1;
    }
  }

  // ── 보석 랭킹 (SSR 기본 데이터) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (tenantUserFilter as any)?.user?.tenantId;
  const gemCounts = await prisma.learningProgress.groupBy({
    by: ['userId'],
    where: {
      stage: 'BLANK_FULL',
      completed: true,
      ...(tenantId ? { user: { tenantId } } : {}),
    },
    _count: { conceptId: true },
  });

  const gemSorted = gemCounts
    .map((g) => ({ userId: g.userId, completedGems: g._count.conceptId }))
    .sort((a, b) => b.completedGems - a.completedGems)
    .slice(0, 50);

  const gemUserIds = gemSorted.map((s) => s.userId);
  const gemProfiles = gemUserIds.length > 0
    ? await prisma.studentProfile.findMany({
        where: { userId: { in: gemUserIds } },
        include: {
          user: { select: { id: true, name: true } },
          representativeBadge: { select: { icon: true } },
        },
      })
    : [];
  const gemProfileMap = new Map(gemProfiles.map((p) => [p.userId, p]));

  const gemRankings: RankingEntry[] = gemSorted.map((s, i) => {
    const p = gemProfileMap.get(s.userId);
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

  const myGemEntry = gemRankings.find((r) => r.isMe);
  let myGemRank = myGemEntry?.rank ?? null;
  if (!myGemRank) {
    const myGems = await prisma.learningProgress.count({
      where: { userId: user.id, stage: 'BLANK_FULL', completed: true },
    });
    if (myGems > 0) {
      myGemRank = gemSorted.filter((s) => s.completedGems > myGems).length + 1;
    }
  }

  return (
    <PageContainer maxWidth="xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">랭킹 보드</h1>
          <p className="text-sm text-text-secondary">실시간 학습 랭킹</p>
        </div>
      </div>
      <RankingContent
        initialXpRankings={xpRankings}
        initialXpMyRank={myXpRank}
        initialGemRankings={gemRankings}
        initialGemMyRank={myGemRank}
      />
    </PageContainer>
  );
}
