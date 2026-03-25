import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, requireResource } from '@/lib/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id } = await params;

  const targetUser = await requireResource(
    () => prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, role: true },
    }),
    '사용자를 찾을 수 없습니다'
  );
  if (isResponse(targetUser)) return targetUser;

  if (targetUser.role === 'STUDENT') {
    return NextResponse.json({ data: await getStudentStats(id) });
  }
  return NextResponse.json({ data: await getTeacherStats(id) });
}

async function getStudentStats(userId: string) {
  const [
    profile,
    testAttempts,
    arithmeticAttempts,
    learningProgress,
    assignments,
    recentPoints,
    homeworkEnrollments,
    timeAttackRecords,
    timeAttackCount,
  ] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        totalXp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        lastActiveAt: true,
      },
    }),
    prisma.testAttempt.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        score: true,
        maxScore: true,
        correctCount: true,
        totalCount: true,
        xpEarned: true,
        completedAt: true,
        startedAt: true,
        test: { select: { title: true, grade: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
    prisma.arithmeticAttempt.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        category: true,
        level: true,
        correctCount: true,
        problemCount: true,
        score: true,
        xpEarned: true,
        totalTimeSeconds: true,
        completedAt: true,
        createdAt: true,
        homeworkPlanId: true,
        homeworkDayIndex: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.learningProgress.findMany({
      where: { userId },
      select: {
        id: true,
        stage: true,
        completed: true,
        score: true,
        completedAt: true,
        startedAt: true,
        concept: { select: { title: true, chapter: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.testAssignment.findMany({
      where: { studentId: userId },
      select: {
        status: true,
        bestScore: true,
        dueDate: true,
        test: { select: { title: true } },
      },
      orderBy: { assignedAt: 'desc' },
      take: 5,
    }),
    prisma.pointTransaction.findMany({
      where: { userId },
      select: { amount: true, type: true, reason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.arithmeticHomeworkEnrollment.count({
      where: { studentId: userId },
    }),
    prisma.timeAttackRecord.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        category: true,
        level: true,
        correctCount: true,
        totalTime: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.timeAttackRecord.count({
      where: { studentId: userId },
    }),
  ]);

  // 집계 (위 Promise.all과 별도로 병렬 실행)
  const [allTests, allArithmetic, allLearning] = await Promise.all([
    prisma.testAttempt.aggregate({
      where: { studentId: userId, completedAt: { not: null } },
      _count: true,
      _avg: { score: true },
    }),
    prisma.arithmeticAttempt.aggregate({
      where: { studentId: userId, completedAt: { not: null } },
      _count: true,
      _sum: { correctCount: true, problemCount: true, totalTimeSeconds: true },
    }),
    prisma.learningProgress.groupBy({
      by: ['completed'],
      where: { userId },
      _count: true,
    }),
  ]);

  const completedCount = allLearning.find((g) => g.completed)?._count ?? 0;
  const totalLearning = allLearning.reduce((sum, g) => sum + g._count, 0);

  // 타임어택 카테고리+레벨별 최고기록
  const bestMap = new Map<string, { category: string; level: string; best: number }>();
  for (const r of timeAttackRecords) {
    const key = `${r.category}:${r.level}`;
    const existing = bestMap.get(key);
    if (!existing || r.correctCount > existing.best) {
      bestMap.set(key, { category: r.category, level: r.level, best: r.correctCount });
    }
  }
  const timeAttackBestByCategory = Array.from(bestMap.values());

  return {
    type: 'student' as const,
    profile,
    summary: {
      testCount: allTests._count,
      testAvgScore: Math.round(allTests._avg?.score ?? 0),
      arithmeticCount: allArithmetic._count,
      arithmeticCorrect: allArithmetic._sum?.correctCount ?? 0,
      arithmeticTotal: allArithmetic._sum?.problemCount ?? 0,
      arithmeticTime: allArithmetic._sum?.totalTimeSeconds ?? 0,
      learningTotal: totalLearning,
      learningCompleted: completedCount,
      homeworkEnrollments,
      timeAttackCount,
      timeAttackBestByCategory,
    },
    recentTests: testAttempts,
    recentArithmetic: arithmeticAttempts,
    recentLearning: learningProgress,
    recentAssignments: assignments,
    recentPoints,
    recentTimeAttacks: timeAttackRecords,
  };
}

async function getTeacherStats(userId: string) {
  const [
    testsCreated,
    homeworkPlans,
    commentsWritten,
    questionsGenerated,
    classrooms,
  ] = await Promise.all([
    prisma.test.count({ where: { createdBy: userId } }),
    prisma.arithmeticHomeworkPlan.count({ where: { createdBy: userId } }),
    prisma.teacherComment.count({ where: { teacherId: userId } }),
    prisma.questionGenerationLog.count({ where: { teacherId: userId } }),
    prisma.classroom.findMany({
      where: { teacherId: userId },
      select: {
        id: true, name: true, grade: true, createdAt: true,
        students: {
          where: { deletedAt: null },
          select: { id: true, name: true, grade: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const [recentTests, recentHomework, recentComments] = await Promise.all([
    prisma.test.findMany({
      where: { createdBy: userId },
      select: {
        id: true,
        title: true,
        grade: true,
        questionCount: true,
        createdAt: true,
        _count: { select: { attempts: true, assignments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.arithmeticHomeworkPlan.findMany({
      where: { createdBy: userId },
      select: {
        id: true,
        title: true,
        totalDays: true,
        dailyCount: true,
        isActive: true,
        createdAt: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.teacherComment.findMany({
      where: { teacherId: userId },
      select: {
        month: true,
        content: true,
        createdAt: true,
        student: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    type: 'teacher' as const,
    summary: {
      testsCreated,
      homeworkPlans,
      commentsWritten,
      questionsGenerated,
      classroomCount: classrooms.length,
    },
    classrooms,
    recentTests,
    recentHomework,
    recentComments,
  };
}
