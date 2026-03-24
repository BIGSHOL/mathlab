import {
  Star, Flame, BookOpen, Trophy, ClipboardCheck, Calculator,
  CheckCircle, XCircle, History, ArrowRight, Layers,
} from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth';
import { getViewAsUser } from '@/lib/view-as';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { xpToNextLevel } from '@/lib/utils/xp';
import { CATEGORY_LABELS, LEVEL_LABELS } from '@/lib/services/arithmetic-generator/types';
import Link from 'next/link';
import { BadgeModalSection } from './BadgeModalSection';
import { PageContainer } from '@/components/ui/PageContainer';

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

const stageLabels: Record<string, string> = {
  READING: '개념 읽기',
  BLANK_EASY: '빈칸 (쉬움)',
  BLANK_HARD: '빈칸 (어려움)',
  BLANK_FULL: '통문장 암기',
  BLANK_PAGE: '통문장 암기',
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ _as?: string }>;
}) {
  const realUser = await getCurrentUser();
  if (!realUser) redirect('/login');
  const user = await getViewAsUser(await searchParams) ?? realUser;

  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  const totalXp = profile?.totalXp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.currentStreak ?? 0;
  const longestStreak = profile?.longestStreak ?? 0;
  const nextLevel = xpToNextLevel(totalXp);

  const completedConcepts = await prisma.learningProgress.groupBy({
    by: ['conceptId'],
    where: { userId: user.id, stage: 'BLANK_FULL', completed: true },
  });
  const blankPageCompleted = completedConcepts.length;

  const totalCompleted = await prisma.learningProgress.count({
    where: { userId: user.id, completed: true },
  });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { grade: true, tenantId: true } });
  const tenantId = dbUser?.tenantId || null;

  // ── 최근 7일 활동 + 총 학습일 ──
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const [recentLearning, recentArith, recentTests] = await Promise.all([
    prisma.learningProgress.findMany({
      where: { userId: user.id, updatedAt: { gte: sevenDaysAgo } },
      select: { updatedAt: true },
    }),
    prisma.arithmeticAttempt.findMany({
      where: { studentId: user.id, completedAt: { gte: sevenDaysAgo } },
      select: { completedAt: true },
    }),
    prisma.testAttempt.findMany({
      where: { studentId: user.id, completedAt: { gte: sevenDaysAgo } },
      select: { completedAt: true },
    }),
  ]);

  // 최근 7일 각 날짜별 활동 여부
  const activeDays = new Set<string>();
  for (const r of recentLearning) activeDays.add(r.updatedAt.toISOString().slice(0, 10));
  for (const r of recentArith) if (r.completedAt) activeDays.add(r.completedAt.toISOString().slice(0, 10));
  for (const r of recentTests) if (r.completedAt) activeDays.add(r.completedAt.toISOString().slice(0, 10));

  const weekDays: { label: string; date: string; active: boolean }[] = [];
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    weekDays.push({ label: dayLabels[d.getDay()], date: dateStr, active: activeDays.has(dateStr) });
  }

  // 총 학습일 (distinct dates)
  const allDates = new Set<string>();
  const allProgress = await prisma.learningProgress.findMany({ where: { userId: user.id }, select: { updatedAt: true } });
  const allArith = await prisma.arithmeticAttempt.findMany({ where: { studentId: user.id, completedAt: { not: null } }, select: { completedAt: true } });
  for (const r of allProgress) allDates.add(r.updatedAt.toISOString().slice(0, 10));
  for (const r of allArith) if (r.completedAt) allDates.add(r.completedAt.toISOString().slice(0, 10));
  const totalLearningDays = allDates.size;

  // ── 학습 내역 데이터 ──

  const recentProgress = await prisma.learningProgress.findMany({
    where: { userId: user.id },
    include: { concept: { include: { subject: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
  const seenConcepts = new Set<string>();
  const uniqueProgress = recentProgress.filter((p) => {
    if (seenConcepts.has(p.conceptId)) return false;
    seenConcepts.add(p.conceptId);
    return true;
  }).slice(0, 6);

  const testAttempts = await prisma.testAttempt.findMany({
    where: { studentId: user.id, completedAt: { not: null } },
    include: { test: { select: { title: true } } },
    orderBy: { completedAt: 'desc' },
    take: 5,
  });

  const arithmeticAttempts = await prisma.arithmeticAttempt.findMany({
    where: { studentId: user.id, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    take: 5,
  });

  const earnedBadges = await prisma.userBadge.findMany({
    where: { userId: user.id },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  });

  const earnedBadgeMap = new Map(earnedBadges.map(ub => [ub.badgeId, ub.earnedAt]));
  const allBadgesRaw = await prisma.badge.findMany({ orderBy: { sortOrder: 'asc' } });

  // 그룹화 처리 (condition.type 기준)
  const groupedBadgesMap = new Map<string, typeof allBadgesRaw>();
  for (const b of allBadgesRaw) {
    const condition = b.condition as Record<string, unknown>;
    const type = (condition?.type as string) || b.id;
    if (!groupedBadgesMap.has(type)) {
      groupedBadgesMap.set(type, []);
    }
    groupedBadgesMap.get(type)!.push(b);
  }

  // 각 그룹에서 대표(가장 최근 달성 혹은 미달성 첫 번째) 뱃지 추출
  const displayBadges: Array<{ badge: typeof allBadgesRaw[number]; group: typeof allBadgesRaw; isEarned: boolean; earnedDate?: Date }> = [];
  for (const [_type, groupAll] of groupedBadgesMap.entries()) {
    groupAll.sort((a, b) => {
      const valA = ((a.condition as Record<string, unknown>)?.value as number) || 0;
      const valB = ((b.condition as Record<string, unknown>)?.value as number) || 0;
      if (valA !== valB) return valA - valB;
      return a.sortOrder - b.sortOrder;
    });

    let lastEarnedIdx = -1;
    for (let i = groupAll.length - 1; i >= 0; i--) {
      if (earnedBadgeMap.has(groupAll[i].id)) {
        lastEarnedIdx = i;
        break;
      }
    }

    const displayBadge = lastEarnedIdx >= 0 ? groupAll[lastEarnedIdx] : groupAll[0];
    const isEarned = lastEarnedIdx >= 0;
    const earnedDate = lastEarnedIdx >= 0 ? earnedBadgeMap.get(displayBadge.id) : undefined;

    displayBadges.push({
      badge: displayBadge,
      group: groupAll,
      isEarned,
      earnedDate,
    });
  }

  // 렌더링을 위한 최종 정렬
  displayBadges.sort((a, b) => {
    if (a.isEarned && !b.isEarned) return -1;
    if (!a.isEarned && b.isEarned) return 1;
    if (a.isEarned && b.isEarned) {
      return (b.earnedDate?.getTime() || 0) - (a.earnedDate?.getTime() || 0);
    }
    return a.badge.sortOrder - b.badge.sortOrder;
  });

  // --- 지점(Tenant)별 업적 통계 데이터 계산 ---
  const totalStudents = await prisma.user.count({
    where: tenantId ? { tenantId, role: 'STUDENT' } : { role: 'STUDENT' }
  });

  const badgeGroupStats = await prisma.userBadge.groupBy({
    by: ['badgeId'],
    where: tenantId ? { user: { tenantId } } : {},
    _count: { userId: true },
  });
  const earnersCountMap = new Map(badgeGroupStats.map(g => [g.badgeId, g._count.userId]));

  // 각 획득 뱃지에 대한 지점 내 달성 순위(N번째)
  const earnedRankMap = new Map<string, number>();
  for (const ub of earnedBadges) {
    const olderOrSameEarners = await prisma.userBadge.count({
      where: {
        badgeId: ub.badgeId,
        ...(tenantId ? { user: { tenantId } } : {}),
        earnedAt: { lte: ub.earnedAt },
      },
    });
    earnedRankMap.set(ub.badgeId, olderOrSameEarners);
  }

  const recentWrong = await prisma.answerLog.findMany({
    where: { attempt: { studentId: user.id }, isCorrect: false },
    include: { attempt: { select: { test: { select: { title: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const seenQIds = new Set<string>();
  const uniqueWrong = recentWrong.filter((a) => {
    if (seenQIds.has(a.questionId)) return false;
    seenQIds.add(a.questionId);
    return true;
  }).slice(0, 5);
  const wrongQIds = uniqueWrong.map((a) => a.questionId);
  const wrongQuestions = wrongQIds.length > 0
    ? await prisma.question.findMany({
      where: { id: { in: wrongQIds } },
      select: { id: true, content: true, chapter: true },
    })
    : [];
  const wrongQMap = new Map(wrongQuestions.map((q) => [q.id, q]));

  const miniStats = [
    { icon: <Star className="w-3.5 h-3.5 text-amber-500" />, label: '총 XP', value: totalXp.toLocaleString(), color: 'bg-amber-50 text-amber-700' },
    { icon: <Flame className="w-3.5 h-3.5 text-orange-500" />, label: '연속', value: `${streak}일`, color: 'bg-orange-50 text-orange-700' },
    { icon: <Layers className="w-3.5 h-3.5 text-blue-500" />, label: '완료', value: String(totalCompleted), color: 'bg-blue-50 text-blue-700' },
    { icon: <Trophy className="w-3.5 h-3.5 text-purple-500" />, label: '백지쓰기', value: String(blankPageCompleted), color: 'bg-purple-50 text-purple-700' },
  ];

  const renderBadgeGrid = (items: typeof displayBadges) => (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 relative">
      {items.map(({ badge, group, isEarned, earnedDate }) => {
        const condition = badge.condition as Record<string, unknown>;
        const isHidden = (condition?.type as string)?.startsWith('hidden_');
        const displayLabel = (!isEarned && isHidden) ? '???' : badge.label;
        const displayDesc = (!isEarned && isHidden) ? '비밀 업적입니다' : badge.description;

        const earnersCount = earnersCountMap.get(badge.id) || 0;
        const earnRate = Math.round((earnersCount / Math.max(1, totalStudents)) * 100);

        return (
          <div
            key={badge.id}
            className={`group flex flex-col items-center p-2 rounded-xl border h-[114px] justify-center relative hover:z-[60] transition-[transform,box-shadow,opacity,filter] duration-150 ${isEarned
              ? 'bg-white border-amber-100/50 shadow-sm hover:shadow-md hover:-translate-y-1'
              : 'bg-slate-50 border-slate-100 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 hover:-translate-y-1'
              }`}
          >
            {/* 커스텀 호버 툴팁 */}
            <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 flex items-stretch gap-0 bg-slate-800 text-white rounded-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 z-50 shadow-xl border border-slate-700 after:absolute after:inset-x-0 after:h-4 after:top-full">

              {/* 좌측 패널: 이미지 및 기본 정보 */}
              <div className="w-48 flex flex-col items-center justify-between">
                <div className={`w-28 h-28 flex shrink-0 items-center justify-center text-5xl mb-3 rounded-2xl shadow-xl ring-1 ring-white/10 overflow-hidden ${isEarned ? 'bg-slate-700' : 'bg-slate-700/50 opacity-60 grayscale'}`}>
                  {(!isEarned && isHidden) ? '🔒' : (
                    badge.icon.startsWith('/') ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={badge.icon} alt={badge.label} className="w-full h-full object-cover" />
                    ) : (
                      badge.icon
                    )
                  )}
                </div>

                <div className="w-full text-center mb-3">
                  <p className="font-extrabold text-amber-300 text-base leading-tight mb-1.5">{displayLabel}</p>
                  {isEarned && isHidden ? (
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-amber-500/20 mx-1">
                      <p className="text-amber-300 text-[10px] font-bold flex justify-center items-center gap-1 mb-1">✨ 히든 업적 오픈 조건</p>
                      <p className="text-slate-100 text-xs leading-snug">{displayDesc}</p>
                    </div>
                  ) : (
                    <p className="text-slate-300 text-xs leading-tight px-1 break-keep-all">{displayDesc}</p>
                  )}
                </div>

                <div className="flex justify-between items-center bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 w-full mt-auto">
                  <div className="text-center w-1/2 border-r border-slate-700/50">
                    <p className="text-[9px] text-slate-400 mb-0.5">전체 달성률</p>
                    <p className="text-sm font-bold text-white">{earnRate}%</p>
                  </div>
                  <div className="text-center w-1/2">
                    <p className="text-[9px] text-slate-400 mb-0.5">내 달성 순서</p>
                    <p className="text-sm font-bold text-amber-300">{isEarned ? `${earnedRankMap.get(badge.id)}번째` : '-'}</p>
                  </div>
                </div>
              </div>

              {/* 우측 패널: 진행 상황 (단일 업적 포함 항상 노출하여 디자인 일관성 유지) */}
              <div className="w-52 border-l border-slate-700/50 ml-4 pl-4 flex flex-col relative">
                <div className="sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-slate-700/80 shrink-0 z-10">
                  <p className="text-[11px] text-slate-300 font-bold">{group.length > 1 ? '단계별 진행 상황' : '업적 달성 조건'}</p>
                </div>
                <div className="space-y-3 break-words overflow-y-auto max-h-[16rem] pr-1 scrollbar-hide">
                  {group.map((b, idx) => {
                    const hasB = earnedBadgeMap.has(b.id);
                    const b_cond = b.condition as Record<string, unknown>;
                    const b_hidden = (b_cond?.type as string)?.startsWith('hidden_');
                    const b_title = (!hasB && b_hidden) ? '???' : b.label;
                    const isActiveNext = !hasB && (idx === 0 || earnedBadgeMap.has(group[idx - 1].id));

                    return (
                      <div key={b.id} className={`flex items-start gap-2 text-xs leading-snug ${hasB ? 'text-amber-300 font-bold' : isActiveNext ? 'text-slate-100' : 'text-slate-500'}`}>
                        <span className="shrink-0 w-4 text-center mt-0.5">{hasB ? '✅' : isActiveNext ? '▶' : '🔒'}</span>
                        <div>
                          <span className="block mb-0.5">{b_title}</span>
                          <span className={`font-normal text-[10px] block shrink-0 ${hasB ? 'text-amber-400/80' : isActiveNext ? 'text-slate-400' : 'text-slate-500'}`}>{(!hasB && b_hidden) ? '비밀 업적입니다' : b.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 툴팁 화살표 (아래쪽 중앙 고정) */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800"></div>
            </div>

            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl shrink-0 mb-1.5 shadow-inner overflow-hidden ${isEarned ? '' : 'opacity-40'
                } ${(!isEarned && isHidden) ? '' : badge.icon.startsWith('/') ? 'ring-1 ring-black/5' : ''}`}
              style={{ backgroundColor: isEarned ? `${badge.color}15` : '#f1f5f9' }}
            >
              {(!isEarned && isHidden) ? '🔒' : (
                badge.icon.startsWith('/') ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={badge.icon} alt={badge.label} className="w-full h-full object-cover scale-[1.15]" />
                ) : (
                  badge.icon
                )
              )}
            </div>
            <p className="text-[11px] font-extrabold text-text-primary leading-tight text-center w-full truncate">
              {displayLabel}
            </p>

            {isEarned && isHidden && (
              <p className="text-[9px] text-amber-600/80 font-semibold leading-tight text-center w-full truncate mt-0.5 px-0.5">
                {displayDesc}
              </p>
            )}

            {isEarned ? (
              <div className="mt-1 flex items-center justify-center bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">
                <span className="text-[8px] font-bold tracking-tight text-center w-full truncate">
                  {new Intl.DateTimeFormat('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).format(earnedDate).replace(/\s/g, '')}
                </span>
              </div>
            ) : (
              <p className="text-[9px] text-text-secondary text-center w-full truncate mt-1">
                미달성
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <PageContainer maxWidth="lg">
      {/* ──── 상단: 프로필 헤더 & 학습 스트릭 ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 mb-6">
        {/* 1. 프로필 정보 (좌측) */}
        <Card padding="md" className="rounded-xl flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-xl font-bold shrink-0">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-text-primary truncate">{user.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-xp-gold to-amber-500 text-white text-xs font-bold shrink-0">
                  Lv.{level}
                </span>
                {dbUser?.grade && (
                  <span className="text-xs text-text-secondary shrink-0">초등 {dbUser.grade}학년</span>
                )}
              </div>
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-text-secondary">Lv.{level} → Lv.{level + 1}</span>
                  <span className="text-xs text-text-secondary">{nextLevel.current}/{nextLevel.required} XP</span>
                </div>
                <ProgressBar
                  value={nextLevel.current}
                  max={nextLevel.required}
                  color="bg-gradient-to-r from-xp-gold to-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 미니 통계 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-auto">
            {miniStats.map((s) => (
              <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg ${s.color}`}>
                {s.icon}
                <div className="min-w-0">
                  <p className="text-xs font-medium opacity-70">{s.label}</p>
                  <p className="text-sm font-extrabold leading-tight">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 2. 학습 스트릭 (우측) */}
        <Card className="rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-1.5 bg-slate-50/50">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <h2 className="text-sm font-bold text-text-primary">학습 스트릭</h2>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-center">
            {/* 숫자 지표 */}
            <div className="flex items-center gap-5 mb-4">
              <div>
                <p className="text-[11px] text-text-secondary">현재 연속</p>
                <p className="text-base font-extrabold text-orange-600">{streak}일</p>
              </div>
              <div>
                <p className="text-[11px] text-text-secondary">최장 기록</p>
                <p className="text-base font-extrabold text-text-primary">{longestStreak}일</p>
              </div>
              <div>
                <p className="text-[11px] text-text-secondary">총 학습일</p>
                <p className="text-base font-extrabold text-blue-600">{totalLearningDays}일</p>
              </div>
            </div>

            {/* 주간 활동 */}
            <p className="text-[10px] text-text-secondary mb-1.5">최근 7일</p>
            <div className="flex items-center gap-1.5">
              {weekDays.map((d) => (
                <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-full aspect-square rounded-md flex items-center justify-center ${d.active
                    ? 'bg-orange-500'
                    : 'bg-slate-100'
                    }`}>
                    {d.active && <Flame className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-[9px] font-medium ${d.active ? 'text-orange-600' : 'text-slate-400'}`}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ──── 2×2 그리드 (행 단위 정렬) ──── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 최근 학습 */}
        <Card className="rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-primary" />
              <h2 className="text-sm font-bold text-text-primary">최근 학습</h2>
            </div>
            <Link href="/subjects" className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5">
              더보기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {uniqueProgress.length === 0 ? (
              <div className="py-6 text-center">
                <BookOpen className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-text-secondary text-xs">학습 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {uniqueProgress.map((p) => {
                  const isCompleted = p.stage === 'BLANK_FULL' && p.completed;
                  return (
                    <Link key={p.id} href={`/concepts/${p.concept.conceptCode ?? p.conceptId}`}>
                      <div className={`flex items-center gap-2 px-2.5 py-2 rounded-md transition-all hover:bg-slate-50 group ${isCompleted ? 'bg-emerald-50/40' : ''
                        }`}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                          {isCompleted ? <CheckCircle className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                            {p.concept.title}
                          </p>
                          <p className="text-xs text-text-secondary">{stageLabels[p.stage] ?? p.stage}</p>
                        </div>
                        <span className="text-xs text-text-secondary shrink-0">{timeAgo(p.updatedAt)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* 연산 연습 */}
        <Card className="rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-emerald-500" />
              <h2 className="text-sm font-bold text-text-primary">연산 연습</h2>
            </div>
            <Link href="/practice/arithmetic" className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5">
              연습하기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {arithmeticAttempts.length === 0 ? (
              <div className="py-6 text-center">
                <Calculator className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-text-secondary text-xs">연산 연습 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {arithmeticAttempts.map((a) => {
                  const pct = a.problemCount > 0 ? Math.round((a.correctCount / a.problemCount) * 100) : 0;
                  return (
                    <div key={a.id} className="flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-slate-50 transition-all">
                      <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
                        <Calculator className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">{(CATEGORY_LABELS as Record<string, string>)[a.category] ?? a.category} · {(LEVEL_LABELS as Record<string, string>)[a.level] ?? a.level}</p>
                        <p className="text-xs text-text-secondary">
                          {a.correctCount}/{a.problemCount}
                          {a.totalTimeSeconds > 0 ? ` · ${Math.floor(a.totalTimeSeconds / 60)}분 ${a.totalTimeSeconds % 60}초` : ''}
                        </p>
                      </div>
                      <p className={`text-xs font-extrabold shrink-0 ${pct >= 80 ? 'text-emerald-600' : pct < 50 ? 'text-red-500' : 'text-text-primary'}`}>
                        {pct}%
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* 시험 결과 */}
        <Card className="rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-blue-500" />
              <h2 className="text-sm font-bold text-text-primary">시험 결과</h2>
            </div>
            <Link href="/my-tests" className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5">
              전체 보기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {testAttempts.length === 0 ? (
              <div className="py-6 text-center">
                <ClipboardCheck className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-text-secondary text-xs">시험 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {testAttempts.map((a) => {
                  const pct = a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0;
                  const isGood = pct >= 80;
                  const isBad = pct < 50;
                  return (
                    <div key={a.id} className="flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-slate-50 transition-all">
                      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${isGood ? 'bg-emerald-100 text-emerald-600' : isBad ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-600'
                        }`}>
                        <ClipboardCheck className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">{a.test.title}</p>
                        <p className="text-xs text-text-secondary">
                          {a.correctCount}/{a.totalCount} 정답{a.xpEarned > 0 ? ` · +${a.xpEarned} XP` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-extrabold ${isGood ? 'text-emerald-600' : isBad ? 'text-red-500' : 'text-text-primary'}`}>
                          {pct}점
                        </p>
                        <p className="text-xs text-text-secondary">{a.completedAt ? timeAgo(a.completedAt) : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {uniqueWrong.length > 0 && (
          <Card className="rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <h2 className="text-sm font-bold text-text-primary">최근 오답</h2>
              </div>
              <Link href="/practice/revenge" className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5">
                복습하기 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-3">
              <div className="space-y-1">
                {uniqueWrong.map((ans) => {
                  const q = wrongQMap.get(ans.questionId);
                  if (!q) return null;
                  const preview = q.content.replace(/\$[^$]*\$/g, '□').replace(/[#*]/g, '').slice(0, 40);
                  return (
                    <div key={ans.id} className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-red-50/30">
                      <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">{preview}</p>
                        <p className="text-xs text-text-secondary">
                          {ans.attempt.test.title}{q.chapter ? ` · ${q.chapter}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary shrink-0">{timeAgo(ans.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

      </div>

      {/* 전체 업적(배지) 보관함 - 모달 컴포넌트로 분리 */}
      <BadgeModalSection
        achievementRateText={`달성률: ${Math.round((earnedBadges.length / Math.max(1, allBadgesRaw.length)) * 100)}% (${earnedBadges.length}/${allBadgesRaw.length})`}
        previewNodes={renderBadgeGrid(displayBadges.slice(0, 24))}
        fullNodes={renderBadgeGrid(displayBadges)}
      />

    </PageContainer>
  );
}
