/**
 * 학생 대시보드 — v2 디자인 (V1: NEXT-BEST-ACTION 중심)
 *
 * 시안: data/refact/pages/student-dashboard-hifi.html § V1
 * 마크업/스타일: mathlab-v2.css 의 .topbar, .main, .card(.stat|.elev), .chip,
 *   .btn, .grid grid-{2,3,4}, .row .col .between, .gap-*, .mt-* 활용
 *
 * 데이터 fetch: 기존 로직 유지 + 평균 정답률 1개 추가.
 * 사이드바: 부모 (student)/layout.tsx 의 StudentSidebar 그대로 사용.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getViewAsUser } from '@/lib/view-as';
import { prisma } from '@/lib/db';
import { xpToNextLevel } from '@/lib/utils/xp';
import { getTodayHomework } from '@/lib/services/homework';
import { getTodayConceptHomework } from '@/lib/services/concept-homework';
import { getTodayQuestionHomework } from '@/lib/services/question-homework';
import { hasLicense } from '@/lib/services/license';
import type { NextBestAction } from '@/components/student/NextBestActionCard';

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; _as?: string }>;
}) {
  const realUser = await getCurrentUser();
  if (!realUser) redirect('/login');

  const params = await searchParams;

  // Redirect teacher to teacher dashboard (unless preview mode or impersonation)
  if (realUser.role !== 'STUDENT' && !params.preview && !params._as) {
    redirect('/overview');
  }

  const user = await getViewAsUser(params) ?? realUser;

  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  const totalXp = profile?.totalXp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.currentStreak ?? 0;
  const nextLevel = xpToNextLevel(totalXp);

  // 배정된 과정 조회
  const activeEnrollment = await prisma.learningCourseEnrollment.findFirst({
    where: { studentId: user.id, status: 'ACTIVE' },
    include: {
      course: {
        include: {
          concepts: {
            orderBy: { sortOrder: 'asc' },
            include: { concept: { select: { id: true, title: true, conceptCode: true, subject: { select: { title: true } } } } },
          },
        },
      },
    },
  });
  const enrollmentCount = await prisma.learningCourseEnrollment.count({ where: { studentId: user.id } });
  const hasEnrollments = enrollmentCount > 0;

  const courseConceptIds = activeEnrollment?.course.concepts.map((c) => c.conceptId) ?? [];
  const _totalConcepts = hasEnrollments
    ? courseConceptIds.length
    : await prisma.concept.count({ where: user.grade ? { subject: { gradeLevel: user.grade } } : {} });

  const completedConcepts = await prisma.learningProgress.groupBy({
    by: ['conceptId'],
    where: {
      userId: user.id,
      stage: 'BLANK_FULL',
      completed: true,
      ...(hasEnrollments && courseConceptIds.length > 0 ? { conceptId: { in: courseConceptIds } } : {}),
    },
  });
  const completedConceptIds = new Set(completedConcepts.map((c) => c.conceptId));

  const courseConceptProgress = activeEnrollment
    ? await prisma.learningProgress.findMany({
        where: { userId: user.id, conceptId: { in: courseConceptIds } },
        include: { concept: { include: { subject: true } } },
        orderBy: { updatedAt: 'desc' },
      })
    : [];

  const isSequentialCourse = activeEnrollment?.course.mode === 'sequential';
  const courseProgressItems = activeEnrollment
    ? (() => {
        const progressMap = new Map<string, typeof courseConceptProgress[number]>();
        for (const p of courseConceptProgress) {
          if (!progressMap.has(p.conceptId)) progressMap.set(p.conceptId, p);
        }
        const incompleteConcepts = activeEnrollment.course.concepts.filter(
          (cc) => !completedConceptIds.has(cc.conceptId)
        );
        const unlocked = isSequentialCourse
          ? incompleteConcepts.filter((cc) => {
              const idx = activeEnrollment.course.concepts.indexOf(cc);
              if (idx === 0) return true;
              const prevId = activeEnrollment.course.concepts[idx - 1].conceptId;
              return completedConceptIds.has(prevId);
            })
          : incompleteConcepts;
        return unlocked.slice(0, 3).map((cc) => ({
          conceptId: cc.conceptId,
          concept: cc.concept,
          progress: progressMap.get(cc.conceptId),
        }));
      })()
    : [];

  // 과정이 없을 때 fallback: 최근 학습한 개념
  const recentProgress = !activeEnrollment
    ? await prisma.learningProgress.findMany({
        where: { userId: user.id },
        include: { concept: { include: { subject: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      })
    : [];
  const seenConcepts = new Set<string>();
  const uniqueRecentProgress = recentProgress
    .filter((p) => {
      if (seenConcepts.has(p.conceptId)) return false;
      seenConcepts.add(p.conceptId);
      return true;
    })
    .slice(0, 3);

  // Today's homework
  const hasHomeworkLicense = await hasLicense(user.id, 'homework');
  const todayHomework = hasHomeworkLicense ? await getTodayHomework(user.id) : [];
  const pendingHomework = todayHomework.filter((h) => h.status !== 'COMPLETED');

  const todayConceptHw = hasHomeworkLicense ? await getTodayConceptHomework(user.id) : [];
  const pendingConceptHw = todayConceptHw.filter((hw) =>
    hw.concepts.some((c) => !c.allCompleted)
  );

  const todayQuestionHw = hasHomeworkLicense ? await getTodayQuestionHomework(user.id) : [];
  const pendingQuestionHw = todayQuestionHw.filter((hw) => hw.status !== 'COMPLETED');

  // 주간 활동
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyActivity = await prisma.learningProgress.count({
    where: { userId: user.id, updatedAt: { gte: weekAgo } },
  });

  // 최근 7일 정답률 (v2 시안 우측 상단 + Stats 카드)
  const weeklyAnswers = await prisma.answerLog.findMany({
    where: { attempt: { studentId: user.id }, createdAt: { gte: weekAgo } },
    select: { isCorrect: true },
  });
  const weeklyTotal = weeklyAnswers.length;
  const weeklyCorrect = weeklyAnswers.filter((a) => a.isCorrect).length;
  const accuracyPercent = weeklyTotal > 0 ? Math.round((weeklyCorrect / weeklyTotal) * 100) : 0;

  // 최근 오답
  const recentWrongAnswers = await prisma.answerLog.findMany({
    where: { attempt: { studentId: user.id }, isCorrect: false },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const seenQIds = new Set<string>();
  const uniqueWrongAnswers = recentWrongAnswers
    .filter((a) => {
      if (seenQIds.has(a.questionId)) return false;
      seenQIds.add(a.questionId);
      return true;
    })
    .slice(0, 5);

  // 주간 일별 학습량 (7일)
  const dailyActivity: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = await prisma.answerLog.count({
      where: { attempt: { studentId: user.id }, createdAt: { gte: dayStart, lt: dayEnd } },
    });
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})`;
    dailyActivity.push({ date: dateLabel, count });
  }
  const maxDailyCount = Math.max(...dailyActivity.map((d) => d.count), 1);

  // 랭킹 (테넌트 내 상위 5)
  const rankingTenantScope = user.tenantId ? { user: { tenantId: user.tenantId } } : {};
  const topStudents = await prisma.studentProfile.findMany({
    where: { totalXp: { gt: 0 }, ...rankingTenantScope },
    include: { user: { select: { name: true, id: true } } },
    orderBy: { totalXp: 'desc' },
    take: 5,
  });
  const myRank = profile
    ? (await prisma.studentProfile.count({
        where: { totalXp: { gt: profile.totalXp }, ...rankingTenantScope },
      })) + 1
    : null;
  const totalRanked = await prisma.studentProfile.count({
    where: { totalXp: { gt: 0 }, ...rankingTenantScope },
  });

  // ──── Next Best Action ────
  const nextAction: NextBestAction | null = (() => {
    if (pendingHomework.length > 0) {
      const hw = pendingHomework[0];
      return {
        kind: 'arithmetic_hw',
        title: '오늘의 연산 숙제',
        subtitle: `${hw.planTitle} · ${hw.dayLabel} · ${hw.dailyCount}문제`,
        href: '/practice/arithmetic/homework',
        ctaLabel: '바로 시작',
        estimatedMinutes: Math.max(5, Math.round(hw.dailyCount * 0.7)),
        badge: `${hw.dailyCount}문제`,
      };
    }
    if (pendingConceptHw.length > 0) {
      const hw = pendingConceptHw[0];
      const pendingC = hw.concepts.filter((c) => !c.allCompleted);
      const first = pendingC[0];
      return {
        kind: 'concept_hw',
        title: '오늘의 개념 숙제',
        subtitle: `${hw.planTitle} · ${pendingC.length}개 남음`,
        href: first ? `/concepts/${first.id}` : '/subjects',
        ctaLabel: '학습하기',
        estimatedMinutes: pendingC.length * 12,
        badge: `${pendingC.length}개`,
      };
    }
    if (pendingQuestionHw.length > 0) {
      const hw = pendingQuestionHw[0];
      return {
        kind: 'question_hw',
        title: '오늘의 문제 숙제',
        subtitle: `${hw.planTitle} · ${hw.dayLabel} · ${hw.questionCount}문제`,
        href: '/practice/question-homework',
        ctaLabel: '풀기',
        estimatedMinutes: Math.max(10, hw.questionCount * 2),
        badge: `${hw.questionCount}문제`,
      };
    }
    if (uniqueWrongAnswers.length >= 3) {
      return {
        kind: 'revenge',
        title: '복수전에 도전!',
        subtitle: `최근 오답 ${uniqueWrongAnswers.length}개를 정복해 보세요`,
        href: '/practice/revenge',
        ctaLabel: '도전',
        estimatedMinutes: 8,
        badge: '🔥 오답 복수',
      };
    }
    if (activeEnrollment && courseProgressItems.length > 0) {
      const item = courseProgressItems[0];
      return {
        kind: 'course_continue',
        title: '이어서 학습하기',
        subtitle: `${activeEnrollment.course.title} · ${item.concept.title}`,
        href: `/concepts/${item.concept.conceptCode ?? item.conceptId}`,
        ctaLabel: '이어서',
        estimatedMinutes: 15,
      };
    }
    return {
      kind: 'practice',
      title: '오늘도 학습 시작!',
      subtitle: '단원을 골라 학습을 시작해 보세요',
      href: '/subjects',
      ctaLabel: '시작하기',
      estimatedMinutes: 10,
    };
  })();

  // ──── "이어서 할 일" 리스트 (시안 4개 슬롯) ────
  type ContinueItem = {
    icon: string;
    title: string;
    subtitle: string;
    chip?: { tone: 'indigo' | 'warn' | 'gray' | 'danger' | 'success'; label: string };
    href: string;
    primary?: boolean;
  };
  const continueItems: ContinueItem[] = [];

  if (pendingHomework.length > 0) {
    const hw = pendingHomework[0];
    continueItems.push({
      icon: '📝',
      title: hw.planTitle,
      subtitle: `${hw.dailyCount}문항 · ${hw.dayLabel}`,
      chip: { tone: 'indigo', label: `${hw.dailyCount}문제` },
      href: '/practice/arithmetic/homework',
      primary: true,
    });
  }
  if (pendingConceptHw.length > 0) {
    const hw = pendingConceptHw[0];
    const pendingC = hw.concepts.filter((c) => !c.allCompleted);
    const first = pendingC[0];
    continueItems.push({
      icon: '📚',
      title: hw.planTitle,
      subtitle: `개념 ${pendingC.length}개 남음`,
      chip: { tone: 'warn', label: '일일' },
      href: first ? `/concepts/${first.id}` : '/subjects',
    });
  }
  if (pendingQuestionHw.length > 0) {
    const hw = pendingQuestionHw[0];
    continueItems.push({
      icon: '🧪',
      title: hw.planTitle,
      subtitle: `${hw.questionCount}문제 · ${hw.dayLabel}`,
      chip: { tone: 'gray', label: '문제' },
      href: '/practice/question-homework',
    });
  }
  if (uniqueWrongAnswers.length >= 3) {
    continueItems.push({
      icon: '🔥',
      title: '복수전 — 최근 오답',
      subtitle: `${uniqueWrongAnswers.length}개 정복 · 평균 정답률 ${accuracyPercent}%`,
      chip: { tone: 'danger', label: '오답' },
      href: '/practice/revenge',
    });
  }
  // 과정/추천으로 채우기
  if (continueItems.length < 4 && activeEnrollment && courseProgressItems.length > 0) {
    for (const item of courseProgressItems) {
      if (continueItems.length >= 4) break;
      continueItems.push({
        icon: '📖',
        title: item.concept.title,
        subtitle: item.concept.subject?.title ?? '단원학습',
        chip: { tone: 'gray', label: '학습' },
        href: `/concepts/${item.concept.conceptCode ?? item.conceptId}`,
      });
    }
  }
  if (continueItems.length < 4 && uniqueRecentProgress.length > 0) {
    for (const p of uniqueRecentProgress) {
      if (continueItems.length >= 4) break;
      continueItems.push({
        icon: '📖',
        title: p.concept.title,
        subtitle: p.concept.subject?.title ?? '단원학습',
        chip: { tone: 'gray', label: '복습' },
        href: `/concepts/${p.concept.conceptCode ?? p.conceptId}`,
      });
    }
  }

  // ──── 스파크라인 SVG 좌표 (data/refact V1 시안 스타일) ────
  const sparkPoints = dailyActivity
    .map((day, i) => {
      const x = (i / 6) * 320;
      const y = 70 - (day.count / maxDailyCount) * 58;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const sparkAreaPoints = sparkPoints + ' 320,80 0,80';
  const lastX = 320;
  const lastY = 70 - (dailyActivity[6].count / maxDailyCount) * 58;

  // ──── 14-day streak dots ────
  const STREAK_TOTAL = 14;
  const todayIdx = Math.min(streak, STREAK_TOTAL - 1); // 오늘은 streak 그 자체로 표시
  const streakDots = Array.from({ length: STREAK_TOTAL }).map((_, i) => {
    if (i < streak) return 'done';
    if (i === todayIdx && streak < STREAK_TOTAL) return 'today';
    return 'todo';
  });

  // 날짜 라벨
  const today = new Date();
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()];
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${dayName}요일`;

  return (
    <div className="app no-side" style={{ minHeight: 'auto' }}>
      <div>
      {/* ───── Topbar (V1 시안) ───── */}
      <div className="topbar">
        <div>
          <h1>안녕 {user.name} 👋</h1>
          <div className="sub">
            {dateLabel}{streak > 0 ? ` · 🔥 ${streak}일 연속` : ''} · Lv.{level}
          </div>
        </div>
        <div className="spacer" />
        <Link href="/ranking" className="icon-btn" aria-label="랭킹" style={{ textDecoration: 'none' }}>🏆</Link>
        <Link href="/profile" className="icon-btn" aria-label="프로필" style={{ textDecoration: 'none' }}>⚙</Link>
      </div>

      {/* ───── Main ───── */}
      <div className="main">
        {/* V3 GAME HUD — 시즌 배너 (시안: student-dashboard-hifi.html § V3) */}
        {(() => {
          const seasonNum = Math.ceil((new Date().getMonth() + 1) / 3); // 분기 = 시즌
          const seasonNames = ['겨울 도전', '봄의 정복자', '여름 마스터', '가을 챔피언'];
          const seasonName = seasonNames[seasonNum - 1] ?? '시즌';
          const expPct = nextLevel.required > 0 ? Math.round((nextLevel.current / nextLevel.required) * 100) : 0;
          const remainingXp = Math.max(0, nextLevel.required - nextLevel.current);
          return (
            <div className="rr-season-banner">
              <div>
                <div className="kicker">SEASON {seasonNum} · {seasonName}</div>
                <div className="ttl">다음 레벨까지 {remainingXp.toLocaleString()} XP</div>
                <div className="desc">Lv.{level + 1} 달성 시 새 칭호 + 보상 코인</div>
                <div className="bar-row">
                  <div className="bar-wrap"><i style={{ width: `${expPct}%` }} /></div>
                  <div className="bar-meta">
                    <span>{nextLevel.current.toLocaleString()} / {nextLevel.required.toLocaleString()}</span>
                    <span>🔥 {streak}일 연속</span>
                  </div>
                </div>
              </div>
              <div className="trophy">🏆</div>
            </div>
          );
        })()}

        {/* HERO: Next Best Action (다크 인디고 그라데이션) */}
        <div
          className="card elev"
          style={{
            background: 'linear-gradient(135deg, var(--navy) 0%, var(--primary) 100%)',
            color: '#fff',
            border: 'none',
            padding: 28,
          }}
        >
          <div className="row between" style={{ alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600, letterSpacing: '0.08em' }}>
                오늘의 미션 · 약 {nextAction?.estimatedMinutes ?? 10}분
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em' }}>
                {nextAction?.title ?? '오늘의 학습 시작'}
              </div>
              <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                {nextAction?.subtitle ?? '단원을 골라 학습을 시작해 보세요'}
              </div>
              <div className="row gap-12" style={{ marginTop: 18 }}>
                <Link
                  href={nextAction?.href ?? '/subjects'}
                  className="btn lg"
                  style={{
                    background: '#fff',
                    color: 'var(--navy)',
                    border: 'none',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  ▶ {nextAction?.ctaLabel ?? '바로 시작'}
                </Link>
                <Link
                  href="/subjects"
                  className="btn lg"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.25)',
                    textDecoration: 'none',
                  }}
                >
                  단원 둘러보기
                </Link>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>최근 7일 정답률</div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {accuracyPercent}
                <span style={{ fontSize: 18, opacity: 0.7 }}>%</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {weeklyTotal > 0 ? `${weeklyCorrect}/${weeklyTotal} 문제` : '학습을 시작해 보세요'}
              </div>
            </div>
          </div>
        </div>

        {/* STATS 4 */}
        <div className="grid grid-4 mt-16">
          <div className="card stat">
            <div className="label">🔥 연속 학습</div>
            <div className="value">
              {streak}
              <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>일</span>
            </div>
            <div className="delta">{streak >= 7 ? '훌륭해요!' : '오늘도 화이팅!'}</div>
          </div>
          <div className="card stat">
            <div className="label">이번주 학습</div>
            <div className="value">{weeklyActivity}</div>
            <div className="delta">최근 7일</div>
          </div>
          <div className="card stat">
            <div className="label">평균 정답률</div>
            <div className="value">
              {accuracyPercent}
              <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>%</span>
            </div>
            <div className="delta" style={{ color: 'var(--ink-3)' }}>
              최근 7일 {weeklyTotal}문제
            </div>
          </div>
          <div className="card stat">
            <div className="label">획득 XP</div>
            <div className="value">{totalXp.toLocaleString()}</div>
            <div className="delta" style={{ color: 'var(--warn)' }}>
              다음 레벨까지 {nextLevel.remaining.toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* 이어서 할 일 + 이번 주 학습 */}
        <div className="grid grid-2 mt-16">
          <div className="card">
            <div className="card-head">
              <h3>이어서 할 일</h3>
              <Link href="/subjects" className="more" style={{ textDecoration: 'none' }}>
                전체보기 →
              </Link>
            </div>
            <div className="col gap-12">
              {continueItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-3)' }}>
                  <div style={{ fontSize: 13 }}>지금은 할 일이 없어요!</div>
                  <Link
                    href="/subjects"
                    className="btn mt-8"
                    style={{ textDecoration: 'none', display: 'inline-flex' }}
                  >
                    단원 둘러보기 →
                  </Link>
                </div>
              ) : (
                continueItems.map((it, i) => (
                  <Link
                    key={i}
                    href={it.href}
                    className="row gap-12"
                    style={{
                      padding: 8,
                      background: it.primary ? 'var(--primary-50)' : 'transparent',
                      borderRadius: 10,
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: it.primary ? 'var(--primary)' : 'var(--bg)',
                        color: it.primary ? '#fff' : 'var(--ink-2)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 18,
                      }}
                    >
                      {it.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{it.title}</div>
                      <div className="text-3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.subtitle}
                      </div>
                    </div>
                    {it.chip && <span className={`chip ${it.chip.tone}`}>{it.chip.label}</span>}
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>이번 주 학습</h3>
              <span className="more">7일</span>
            </div>
            <svg className="spark" viewBox="0 0 320 80" preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
              <defs>
                <linearGradient id="sparkG" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3B5BDB" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B5BDB" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={sparkAreaPoints} fill="url(#sparkG)" />
              <polyline
                points={sparkPoints}
                stroke="#3B5BDB"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={lastX} cy={lastY} r="4" fill="#3B5BDB" />
            </svg>
            <div className="row between mt-16">
              <div className="text-3">{dailyActivity.map((d) => d.date.split('(')[1]?.replace(')', '')).join('·')}</div>
              <div className="text-3">
                <strong style={{ color: 'var(--ink)' }}>{weeklyActivity}</strong> 건 / 주
              </div>
            </div>
            <div className="row between mt-16" style={{ paddingTop: 14, borderTop: '1px solid var(--line-2)' }}>
              <div>
                <div className="text-3">최근 정답률</div>
                <div style={{ fontWeight: 600 }}>
                  {weeklyTotal > 0 ? `${accuracyPercent}%` : '데이터 없음'}{' '}
                  {weeklyTotal > 0 && (
                    <span
                      className={`chip ${accuracyPercent >= 75 ? 'success' : accuracyPercent >= 50 ? 'warn' : 'danger'}`}
                      style={{ marginLeft: 4 }}
                    >
                      {weeklyTotal}건
                    </span>
                  )}
                </div>
              </div>
              <Link
                href="/practice/revenge"
                className="btn"
                style={{ textDecoration: 'none' }}
              >
                복습하기
              </Link>
            </div>
          </div>
        </div>

        {/* 14일 연속 + 우리 반 */}
        <div className="grid grid-3 mt-16">
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="card-head">
              <h3>🔥 {streak}일 연속 학습</h3>
              <Link href="/practice/arithmetic/homework" className="more" style={{ textDecoration: 'none' }}>
                숙제하러 →
              </Link>
            </div>
            <div className="row gap-12">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14,1fr)', gap: 4, flex: 1 }}>
                {streakDots.map((state, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 6,
                      background:
                        state === 'done'
                          ? 'var(--success)'
                          : state === 'today'
                          ? 'var(--primary)'
                          : 'var(--bg)',
                      outline: state === 'today' ? '2px solid var(--primary-200)' : 'none',
                      outlineOffset: state === 'today' ? 1 : 0,
                      border: state === 'todo' ? '1px dashed var(--line)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="text-3 mt-8">
              {streak >= STREAK_TOTAL
                ? '🎁 14일 도달! 다음 단계로 도전해 보세요.'
                : `${STREAK_TOTAL}일 도달 시 🎁 보상 — ${STREAK_TOTAL - streak}일 남음`}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>
                우리 반{myRank && totalRanked > 0 ? ` (${myRank}등 / ${totalRanked})` : ''}
              </h3>
              <Link href="/ranking" className="more" style={{ textDecoration: 'none' }}>
                전체 →
              </Link>
            </div>
            {topStudents.length === 0 ? (
              <div className="text-3" style={{ textAlign: 'center', padding: '12px 0' }}>
                아직 랭킹 데이터가 없어요.
              </div>
            ) : (
              <div className="col gap-4">
                {topStudents.slice(0, 4).map((s, i) => {
                  const isMe = s.user.id === user.id;
                  const medalBg = ['#FBBF24', '#A3E635', '#94A3B8'][i] ?? '#94A3B8';
                  return (
                    <div
                      key={s.id}
                      className="row between"
                      style={{
                        padding: '6px 0',
                        background: isMe ? 'var(--primary-50)' : 'transparent',
                        borderRadius: isMe ? 6 : 0,
                        margin: isMe ? '0 -6px' : 0,
                        paddingLeft: isMe ? 6 : 0,
                        paddingRight: isMe ? 6 : 0,
                      }}
                    >
                      <span className="row gap-4" style={{ alignItems: 'center', minWidth: 0 }}>
                        <span
                          className="text-3"
                          style={isMe ? { color: 'var(--primary)', fontWeight: 700 } : undefined}
                        >
                          {i + 1}.
                        </span>
                        <div
                          className="av sm"
                          style={{
                            background: isMe ? 'linear-gradient(135deg,#A78BFA,#7C3AED)' : medalBg,
                          }}
                        >
                          {(s.user.name ?? '?').trim()[0] ?? '?'}
                        </div>
                        <strong
                          style={{
                            color: isMe ? 'var(--primary)' : 'var(--ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {s.user.name}
                          {isMe && ' (나)'}
                        </strong>
                      </span>
                      <span
                        className="text-3"
                        style={isMe ? { color: 'var(--primary)', fontWeight: 700 } : undefined}
                      >
                        {s.totalXp.toLocaleString()} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
