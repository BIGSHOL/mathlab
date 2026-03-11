import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
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
  activityType: 'TEST_ATTEMPT' | 'ARITHMETIC_ATTEMPT' | 'LEARNING_PROGRESS';
  description: string;
  detail: string;
  xpEarned: number;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' } },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');

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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 3개 테이블 병렬 조회
  const [testAttempts, arithmeticAttempts, learningProgress] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { studentId: { in: targetUserIds }, startedAt: { gte: thirtyDaysAgo } },
      include: { test: { select: { title: true } } },
      orderBy: { startedAt: 'desc' },
      take: 200,
    }),
    prisma.arithmeticAttempt.findMany({
      where: { studentId: { in: targetUserIds }, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.learningProgress.findMany({
      where: { userId: { in: targetUserIds }, startedAt: { gte: thirtyDaysAgo } },
      include: { concept: { select: { title: true } } },
      orderBy: { updatedAt: 'desc' },
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
