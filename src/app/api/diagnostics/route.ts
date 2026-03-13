import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** POST: 진단평가 생성 (기존 Test 시스템 활용, testType='diagnostic') */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { title, grade, diagnosticType, questionIds } = body;

  if (!title || !grade || !diagnosticType || !questionIds?.length) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '필수 필드가 누락되었습니다' } },
      { status: 400 }
    );
  }

  const test = await prisma.test.create({
    data: {
      title: `[진단] ${title}`,
      grade,
      testType: `diagnostic_${diagnosticType.toLowerCase()}`,
      questionIds,
      questionCount: questionIds.length,
      maxAttempts: 1,
      createdBy: currentUser.id,
    },
  });

  return NextResponse.json({ data: test }, { status: 201 });
}

/** GET: 진단평가 목록 조회 */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const where = {
    testType: { startsWith: 'diagnostic_' },
    isActive: true,
    ...(currentUser.role === 'STUDENT' ? {
      assignments: { some: { studentId: currentUser.id } },
    } : {}),
  };

  const tests = await prisma.test.findMany({
    where,
    select: {
      id: true,
      seq: true,
      title: true,
      grade: true,
      testType: true,
      questionCount: true,
      createdAt: true,
      _count: { select: { attempts: true, assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: tests });
}
