import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';

const STAGE_LABELS: Record<string, string> = {
  READING: '개념 읽기',
  BLANK_EASY: '빈칸 (쉬움)',
  BLANK_HARD: '빈칸 (어려움)',
  BLANK_FULL: '빈칸 (전체)',
  BLANK_PAGE: '백지 쓰기',
};

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  activityType: 'TEST_ATTEMPT' | 'ARITHMETIC_ATTEMPT' | 'LEARNING_PROGRESS' | 'QUESTION_GENERATION';
  description: string;
  detail: string;
  xpEarned: number;
  timestamp: string;
}

interface DaySummary {
  total: number;
  test: number;
  arithmetic: number;
  learning: number;
  generation: number;
}

export async function GET(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view');
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');

  // view=calendar: 월별 일별 집계
  if (view === 'calendar') {
    return handleCalendarView(searchParams, userId, role);
  }

  // 기본: 타임라인 뷰
  return handleTimelineView(searchParams, userId, role);
}

// ── 달력 뷰: 일별 집계 ──

async function handleCalendarView(
  searchParams: URLSearchParams,
  userId: string | null,
  role: string | null,
) {
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1));

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // 대상 사용자
  const userWhere: Record<string, unknown> = { deletedAt: null };
  if (userId) userWhere.id = userId;
  if (role && (role === 'STUDENT' || role === 'TEACHER')) userWhere.role = role;

  const targetUsers = await prisma.user.findMany({
    where: userWhere,
    select: { id: true },
  });
  const targetUserIds = targetUsers.map((u) => u.id);

  // 4개 테이블 병렬 조회
  const [testAttempts, arithmeticAttempts, learningProgress, generationLogs] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { studentId: { in: targetUserIds }, startedAt: { gte: startDate, lt: endDate } },
      select: { startedAt: true, completedAt: true },
    }),
    prisma.arithmeticAttempt.findMany({
      where: { studentId: { in: targetUserIds }, createdAt: { gte: startDate, lt: endDate } },
      select: { createdAt: true },
    }),
    prisma.learningProgress.findMany({
      where: { userId: { in: targetUserIds }, startedAt: { gte: startDate, lt: endDate } },
      select: { startedAt: true },
    }),
    prisma.questionGenerationLog.findMany({
      where: { teacherId: { in: targetUserIds }, createdAt: { gte: startDate, lt: endDate } },
      select: { createdAt: true },
    }),
  ]);

  // 일별 집계
  const calendar: Record<string, DaySummary> = {};

  const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const ensureDay = (key: string) => {
    if (!calendar[key]) calendar[key] = { total: 0, test: 0, arithmetic: 0, learning: 0, generation: 0 };
  };

  for (const ta of testAttempts) {
    const key = toDateKey(ta.completedAt ?? ta.startedAt);
    ensureDay(key);
    calendar[key].test++;
    calendar[key].total++;
  }
  for (const aa of arithmeticAttempts) {
    const key = toDateKey(aa.createdAt);
    ensureDay(key);
    calendar[key].arithmetic++;
    calendar[key].total++;
  }
  for (const lp of learningProgress) {
    const key = toDateKey(lp.startedAt);
    ensureDay(key);
    calendar[key].learning++;
    calendar[key].total++;
  }
  for (const gl of generationLogs) {
    const key = toDateKey(gl.createdAt);
    ensureDay(key);
    calendar[key].generation++;
    calendar[key].total++;
  }

  return NextResponse.json({ data: { calendar } });
}

// ── 타임라인 뷰 ──

async function handleTimelineView(
  searchParams: URLSearchParams,
  userId: string | null,
  role: string | null,
) {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const dateFilter = searchParams.get('date'); // YYYY-MM-DD

  // 대상 사용자 조회
  const userWhere: Record<string, unknown> = { deletedAt: null };
  if (userId) userWhere.id = userId;
  if (role && (role === 'STUDENT' || role === 'TEACHER')) userWhere.role = role;

  const targetUsers = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, name: true, role: true },
  });
  const targetUserIds = targetUsers.map((u) => u.id);
  const userMap = new Map(targetUsers.map((u) => [u.id, u]));

  // 날짜 범위 결정
  let dateStart: Date;
  let dateEnd: Date | undefined;
  if (dateFilter) {
    dateStart = new Date(dateFilter + 'T00:00:00');
    dateEnd = new Date(dateFilter + 'T23:59:59.999');
  } else {
    dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 30);
  }

  const dateRange = dateEnd
    ? { gte: dateStart, lte: dateEnd }
    : { gte: dateStart };

  // 4개 테이블 병렬 조회
  const [testAttempts, arithmeticAttempts, learningProgress, generationLogs] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { studentId: { in: targetUserIds }, startedAt: dateRange },
      include: { test: { select: { title: true } } },
      orderBy: { startedAt: 'desc' },
      take: 200,
    }),
    prisma.arithmeticAttempt.findMany({
      where: { studentId: { in: targetUserIds }, createdAt: dateRange },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.learningProgress.findMany({
      where: { userId: { in: targetUserIds }, startedAt: dateRange },
      include: { concept: { select: { title: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
    prisma.questionGenerationLog.findMany({
      where: { teacherId: { in: targetUserIds }, createdAt: dateRange },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);

  // 통합 활동 피드 생성
  const activities: ActivityItem[] = [
    ...testAttempts.map((ta) => ({
      id: `test-${ta.id}`,
      userId: ta.studentId,
      userName: userMap.get(ta.studentId)?.name ?? '알 수 없음',
      userRole: userMap.get(ta.studentId)?.role ?? 'STUDENT',
      activityType: 'TEST_ATTEMPT' as const,
      description: `시험 "${ta.test.title}" ${ta.completedAt ? '완료' : '시작'}`,
      detail: ta.completedAt ? `${ta.score}점 (${ta.correctCount}/${ta.totalCount})` : '진행 중',
      xpEarned: ta.xpEarned,
      timestamp: (ta.completedAt ?? ta.startedAt).toISOString(),
    })),
    ...arithmeticAttempts.map((aa) => ({
      id: `arith-${aa.id}`,
      userId: aa.studentId,
      userName: userMap.get(aa.studentId)?.name ?? '알 수 없음',
      userRole: userMap.get(aa.studentId)?.role ?? 'STUDENT',
      activityType: 'ARITHMETIC_ATTEMPT' as const,
      description: `${CATEGORY_LABELS[aa.category as keyof typeof CATEGORY_LABELS] ?? aa.category}`,
      detail: aa.completedAt
        ? `${aa.correctCount}/${aa.problemCount}문제, ${aa.totalTimeSeconds}초`
        : '진행 중',
      xpEarned: aa.xpEarned,
      timestamp: (aa.completedAt ?? aa.createdAt).toISOString(),
    })),
    ...learningProgress.map((lp) => ({
      id: `learn-${lp.id}`,
      userId: lp.userId,
      userName: userMap.get(lp.userId)?.name ?? '알 수 없음',
      userRole: userMap.get(lp.userId)?.role ?? 'STUDENT',
      activityType: 'LEARNING_PROGRESS' as const,
      description: `개념 "${lp.concept.title}" - ${STAGE_LABELS[lp.stage] ?? lp.stage}`,
      detail: lp.completed ? '완료' : '진행 중',
      xpEarned: 0,
      timestamp: (lp.completedAt ?? lp.startedAt).toISOString(),
    })),
    ...generationLogs.map((gl) => ({
      id: `gen-${gl.id}`,
      userId: gl.teacherId,
      userName: userMap.get(gl.teacherId)?.name ?? '알 수 없음',
      userRole: userMap.get(gl.teacherId)?.role ?? 'TEACHER',
      activityType: 'QUESTION_GENERATION' as const,
      description: `문제 생성 (${gl.mode})`,
      detail: gl.success ? '성공' : `실패: ${gl.errorMessage ?? '알 수 없음'}`,
      xpEarned: 0,
      timestamp: gl.createdAt.toISOString(),
    })),
  ];

  // 정렬 + 페이지네이션
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const total = activities.length;
  const offset = (page - 1) * limit;
  const paginated = activities.slice(offset, offset + limit);

  // 요약 통계
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const activeToday = new Set(
    activities.filter((a) => new Date(a.timestamp) >= todayStart).map((a) => a.userId),
  ).size;
  const activeThisWeek = new Set(
    activities.filter((a) => new Date(a.timestamp) >= weekStart).map((a) => a.userId),
  ).size;

  return NextResponse.json({
    data: {
      activities: paginated,
      summary: { totalUsers: targetUsers.length, activeToday, activeThisWeek },
    },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
