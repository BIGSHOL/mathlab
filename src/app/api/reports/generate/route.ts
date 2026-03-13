import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** POST: 학생 학습 리포트 생성 */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { studentId, type } = body;

  if (!studentId || !type) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'studentId와 type이 필요합니다' } },
      { status: 400 }
    );
  }

  // 학생 정보
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { profile: { select: { level: true, totalXp: true } } },
  });
  if (!student) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '학생을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // 최근 30일 시험 결과
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentAttempts = await prisma.testAttempt.findMany({
    where: {
      studentId,
      completedAt: { gte: thirtyDaysAgo },
    },
    include: { test: { select: { title: true } } },
    orderBy: { completedAt: 'desc' },
    take: 10,
  });

  // 오답률 계산
  const recentAnswers = await prisma.answerLog.findMany({
    where: {
      attempt: { studentId, completedAt: { gte: thirtyDaysAgo } },
    },
    select: { isCorrect: true },
  });

  const totalAnswers = recentAnswers.length;
  const correctAnswers = recentAnswers.filter((a) => a.isCorrect).length;
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  const reportContent = {
    studentName: student.name,
    grade: student.grade,
    level: student.profile?.level ?? 1,
    totalXp: student.profile?.totalXp ?? 0,
    period: `${thirtyDaysAgo.toLocaleDateString('ko-KR')} ~ ${new Date().toLocaleDateString('ko-KR')}`,
    testsCompleted: recentAttempts.length,
    accuracy,
    totalAnswers,
    recentTests: recentAttempts.map((a) => ({
      title: a.test.title,
      score: a.score,
      maxScore: a.maxScore,
      completedAt: a.completedAt?.toISOString(),
    })),
    generatedAt: new Date().toISOString(),
  };

  // 리포트 이력 저장
  const report = await prisma.reportHistory.create({
    data: {
      studentId,
      type,
      content: reportContent,
      channel: 'EMAIL',
    },
  });

  return NextResponse.json({ data: { report, content: reportContent } }, { status: 201 });
}
