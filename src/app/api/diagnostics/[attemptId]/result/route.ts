import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { analyzeDiagnostic } from '@/lib/services/diagnostic';

/** POST: 진단평가 결과 분석 실행 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  // 시도 정보 확인
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: true },
  });

  if (!attempt || !attempt.completedAt) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '완료된 시도가 아닙니다' } },
      { status: 400 }
    );
  }

  if (!attempt.test.testType.startsWith('diagnostic_')) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '진단평가가 아닙니다' } },
      { status: 400 }
    );
  }

  // 이미 분석 결과가 있는지 확인
  const existing = await prisma.diagnosticResult.findUnique({
    where: { attemptId },
  });
  if (existing) {
    return NextResponse.json({ data: existing });
  }

  const diagnosticType = attempt.test.testType.replace('diagnostic_', '').toUpperCase();
  const result = await analyzeDiagnostic({
    attemptId,
    studentId: attempt.studentId,
    diagnosticType,
  });

  if (!result) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '분석에 실패했습니다' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: result }, { status: 201 });
}

/** GET: 진단평가 결과 조회 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const result = await prisma.diagnosticResult.findUnique({
    where: { attemptId },
  });

  if (!result) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '진단 결과가 없습니다' } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: result });
}
