import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade');
  const testType = searchParams.get('testType');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { isActive: true };
  if (grade) where.grade = parseInt(grade);
  if (testType) where.testType = testType;

  // 학생은 자기 학년 시험만
  if (currentUser.role === 'STUDENT' && currentUser.grade) {
    where.grade = currentUser.grade;
  }

  const tests = await prisma.test.findMany({
    where,
    include: {
      creator: { select: { name: true } },
      _count: { select: { attempts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 학생인 경우 본인 시도 정보 추가
  let testsWithStatus = tests;
  if (currentUser.role === 'STUDENT') {
    const attempts = await prisma.testAttempt.findMany({
      where: {
        studentId: currentUser.id,
        testId: { in: tests.map((t) => t.id) },
      },
      select: { testId: true, completedAt: true, score: true, maxScore: true },
    });
    const attemptMap = new Map(attempts.map((a) => [a.testId, a]));

    testsWithStatus = tests.map((t) => {
      const attempt = attemptMap.get(t.id);
      return {
        ...t,
        myAttempt: attempt
          ? {
              completed: !!attempt.completedAt,
              score: attempt.score,
              maxScore: attempt.maxScore,
            }
          : null,
      };
    });
  }

  return NextResponse.json({ data: testsWithStatus });
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { title, description, grade, testType, questionIds, timeLimitMin, shuffleOptions } = body;

  if (!title || !grade || !questionIds?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '필수 항목이 누락되었습니다' } },
      { status: 400 }
    );
  }

  const test = await prisma.test.create({
    data: {
      title,
      description: description || null,
      grade,
      testType: testType || 'concept',
      questionIds,
      questionCount: questionIds.length,
      timeLimitMin: timeLimitMin || null,
      shuffleOptions: shuffleOptions || false,
      createdBy: currentUser.id,
    },
  });

  return NextResponse.json({ data: test }, { status: 201 });
}
