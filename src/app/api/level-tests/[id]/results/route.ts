import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { analyzeLevelTest } from '@/lib/services/level-test';

/** GET: 레벨테스트 전체 결과 조회 (선생님용) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { id: testId } = await params;

  // 완료된 시도 조회
  const attempts = await prisma.testAttempt.findMany({
    where: { testId, completedAt: { not: null } },
    include: {
      student: { select: { id: true, name: true, grade: true } },
    },
    orderBy: { completedAt: 'desc' },
  });

  // DiagnosticResult 조회
  const attemptIds = attempts.map((a) => a.id);
  const diagnostics = await prisma.diagnosticResult.findMany({
    where: { attemptId: { in: attemptIds } },
  });
  const diagMap = new Map(diagnostics.map((d) => [d.attemptId, d]));

  const results = attempts.map((attempt) => {
    const diag = diagMap.get(attempt.id);
    return {
      attemptId: attempt.id,
      student: attempt.student,
      score: attempt.score,
      maxScore: attempt.maxScore,
      correctCount: attempt.correctCount,
      totalCount: attempt.totalCount,
      completedAt: attempt.completedAt,
      diagnostic: diag
        ? {
            recommendLevel: diag.recommendLevel,
            overallAccuracy: diag.overallAccuracy,
            domainScores: diag.domainScores,
            weakAreas: diag.weakAreas,
            strongAreas: diag.strongAreas,
          }
        : null,
    };
  });

  // 배정 현황
  const assignments = await prisma.testAssignment.findMany({
    where: { testId },
    include: { student: { select: { id: true, name: true, grade: true } } },
  });

  return NextResponse.json({
    data: { results, assignments },
  });
}

/** POST: 미분석 시도에 대해 분석 실행 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { id: testId } = await params;

  // 완료되었지만 DiagnosticResult가 없는 시도 찾기
  const attempts = await prisma.testAttempt.findMany({
    where: { testId, completedAt: { not: null } },
    select: { id: true, studentId: true },
  });

  const existingDiags = await prisma.diagnosticResult.findMany({
    where: { attemptId: { in: attempts.map((a) => a.id) } },
    select: { attemptId: true },
  });
  const diagSet = new Set(existingDiags.map((d) => d.attemptId));

  const unanalyzed = attempts.filter((a) => !diagSet.has(a.id));
  let analyzed = 0;

  for (const attempt of unanalyzed) {
    try {
      await analyzeLevelTest(attempt.id, attempt.studentId);
      analyzed++;
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json({ data: { analyzed, total: unanalyzed.length } });
}
