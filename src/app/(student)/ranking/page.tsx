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

  // 1. 현재 순위 (top 50) — 같은 테넌트 학생만
  const tenantWhere = getTenantFilter(user);
  const tenantUserFilter = Object.keys(tenantWhere).length > 0
    ? { user: { tenantId: tenantWhere.tenantId as string } }
    : {};

  const profiles = await prisma.studentProfile.findMany({
    where: tenantUserFilter,
    orderBy: { totalXp: 'desc' },
    take: 50,
    include: { user: { select: { id: true, name: true } } },
  });

  const userIds = profiles.map((p) => p.userId);

  // 2. 주간 XP 합산
  const weekStart = getWeekStart();
  const weeklyXpData = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: {
      userId: { in: userIds },
      type: 'EARN',
      createdAt: { gte: weekStart },
    },
    _sum: { amount: true },
  });
  const weeklyMap = new Map(weeklyXpData.map((w) => [w.userId, w._sum.amount ?? 0]));

  // 신규 학생 판별 (기간 전 활동 없는 학생)
  const priorActivity = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: {
      userId: { in: userIds },
      type: 'EARN',
      createdAt: { lt: weekStart },
    },
    _count: { _all: true },
  });
  const usersWithPrior = new Set(priorActivity.map((t) => t.userId));

  // 3. 순위 변동 계산
  const rankings: RankingEntry[] = profiles.map((p, i) => {
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
    };
  });

  // 이전 XP 기준 이전 순위 역산
  const withPrev = rankings.map((r) => ({
    ...r,
    previousTotalXp: r.totalXp - r.weeklyXp,
  }));
  const prevSorted = [...withPrev].sort((a, b) => b.previousTotalXp - a.previousTotalXp);
  const prevRankMap = new Map<string, number>();
  prevSorted.forEach((item, i) => prevRankMap.set(item.userId, i + 1));

  for (const r of rankings) {
    const prevRank = prevRankMap.get(r.userId) ?? r.rank;
    r.rankChange = prevRank - r.rank;
  }

  // 현재 유저 순위 (목록에 없을 경우)
  const myEntry = rankings.find((r) => r.isMe);
  let myRank = myEntry?.rank ?? null;
  if (!myRank) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (profile) {
      myRank = (await prisma.studentProfile.count({
        where: { ...tenantUserFilter, totalXp: { gt: profile.totalXp } },
      })) + 1;
    }
  }

  return (
    <PageContainer maxWidth="xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">랭킹 보드</h1>
          <p className="text-sm text-text-secondary">실시간 XP 랭킹</p>
        </div>
      </div>
      <RankingContent initialRankings={rankings} initialMyRank={myRank} />
    </PageContainer>
  );
}
