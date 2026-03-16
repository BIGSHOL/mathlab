import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeLevelTest } from '@/lib/services/level-test';
import { requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';

/** GET: 레벨테스트 전체 결과 조회 (선생님용) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id } = await params;
  const seq = Number(id);

  if (isNaN(seq)) {
    return badRequest('잘못된 시험 번호입니다');
  }

  const testRecord = await prisma.test.findUnique({ where: { seq }, select: { id: true } });
  if (!testRecord) {
    return notFound('레벨테스트를 찾을 수 없습니다');
  }

  const testId = testRecord.id;

  // 시험 정보 (questionIds 포함)
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, questionIds: true },
  });
  const questionIds = (test?.questionIds as string[]) ?? [];

  // 문제 정보 조회
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, chapter: true, difficulty: true, domain: true, answer: true, questionNum: true },
  });

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

  // AnswerLog 조회 (전체)
  const answerLogs = await prisma.answerLog.findMany({
    where: { attemptId: { in: attemptIds } },
    select: { attemptId: true, questionId: true, selectedAnswer: true, isCorrect: true, timeSpentSeconds: true },
  });
  const answersByAttempt = new Map<string, typeof answerLogs>();
  for (const log of answerLogs) {
    const arr = answersByAttempt.get(log.attemptId) ?? [];
    arr.push(log);
    answersByAttempt.set(log.attemptId, arr);
  }

  const results = attempts.map((attempt) => {
    const diag = diagMap.get(attempt.id);
    const answers = (answersByAttempt.get(attempt.id) ?? []).map((a) => ({
      questionId: a.questionId,
      selectedAnswer: a.selectedAnswer,
      isCorrect: a.isCorrect,
      timeSpentSeconds: a.timeSpentSeconds,
    }));
    return {
      attemptId: attempt.id,
      student: attempt.student,
      score: attempt.score,
      maxScore: attempt.maxScore,
      correctCount: attempt.correctCount,
      totalCount: attempt.totalCount,
      completedAt: attempt.completedAt,
      entryMethod: attempt.entryMethod ?? 'online',
      answers,
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
    data: { results, assignments, questions },
  });
}

/** POST: 미분석 시도에 대해 분석 실행 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id } = await params;
  const seq = Number(id);

  if (isNaN(seq)) {
    return badRequest('잘못된 시험 번호입니다');
  }

  const testRecord = await prisma.test.findUnique({ where: { seq }, select: { id: true } });
  if (!testRecord) {
    return notFound('레벨테스트를 찾을 수 없습니다');
  }

  const testId = testRecord.id;

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

  const settledResults = await Promise.allSettled(
    unanalyzed.map((attempt) => analyzeLevelTest(attempt.id, attempt.studentId))
  );
  const analyzed = settledResults.filter((r) => r.status === 'fulfilled').length;

  return NextResponse.json({ data: { analyzed, total: unanalyzed.length } });
}
