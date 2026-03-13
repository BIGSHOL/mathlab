import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createManualAttempt } from '@/lib/services/manual-grading';

/** POST — 수기 채점용 TestAttempt 생성 */
export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }
  if (currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '선생님만 사용할 수 있습니다' } }, { status: 403 });
  }

  const body = await req.json();
  const { testSeq, testId, studentId } = body;

  if (!studentId) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '학생을 선택해주세요' } }, { status: 400 });
  }

  // testSeq 또는 testId로 시험 찾기
  let resolvedTestId = testId;
  if (!resolvedTestId && testSeq) {
    const test = await prisma.test.findUnique({ where: { seq: Number(testSeq) } });
    if (!test) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '시험을 찾을 수 없습니다' } }, { status: 404 });
    }
    resolvedTestId = test.id;
  }
  if (!resolvedTestId) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '시험을 선택해주세요' } }, { status: 400 });
  }

  // 학생 존재 확인
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== 'STUDENT') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '학생을 찾을 수 없습니다' } }, { status: 404 });
  }

  const { attempt, resumed } = await createManualAttempt({
    testId: resolvedTestId,
    studentId,
    teacherId: currentUser.id,
  });

  // 시험 문제 목록도 함께 반환 (이미 조회한 resolvedTestId 재사용)
  const testForQuestions = await prisma.test.findUniqueOrThrow({
    where: { id: resolvedTestId },
    select: { questionIds: true },
  });
  const questionIds = testForQuestions.questionIds as string[];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true, content: true, choices: true, answer: true, explanation: true,
      difficulty: true, chapter: true, section: true, questionNum: true, domain: true,
    },
  });
  // questionIds 순서 유지
  const orderedQuestions = questionIds
    .map((qid) => questions.find((q) => q.id === qid))
    .filter(Boolean);

  return NextResponse.json({
    data: {
      attempt,
      questions: orderedQuestions,
      resumed,
    },
  });
}
