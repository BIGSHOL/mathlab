import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeDiagnostic } from '@/lib/services/diagnostic';
import { requireAuth, isResponse, notFound, badRequest, serverError, requireLicense } from '@/lib/api';

/** POST: 진단평가 결과 분석 실행 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;
  const licenseCheck = await requireLicense(currentUser, 'diagnostic');
  if (licenseCheck) return licenseCheck;

  // 시도 정보 확인
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: true },
  });

  if (!attempt || !attempt.completedAt) {
    return badRequest('완료된 시도가 아닙니다');
  }

  if (!attempt.test.testType.startsWith('diagnostic_')) {
    return badRequest('진단평가가 아닙니다');
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
    return serverError('분석에 실패했습니다');
  }

  return NextResponse.json({ data: result }, { status: 201 });
}

/** GET: 진단평가 결과 조회 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;
  const licenseCheck2 = await requireLicense(currentUser, 'diagnostic');
  if (licenseCheck2) return licenseCheck2;

  const result = await prisma.diagnosticResult.findUnique({
    where: { attemptId },
  });

  if (!result) {
    return notFound('진단 결과가 없습니다');
  }

  return NextResponse.json({ data: result });
}
