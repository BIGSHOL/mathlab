import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, notFound } from '@/lib/api';
import { createManualAttempt } from '@/lib/services/manual-grading';

/** POST — 수기 채점용 TestAttempt 생성 */
export async function POST(req: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await req.json();
  const { testSeq, testId, studentId } = body;

  if (!studentId) {
    return badRequest('학생을 선택해주세요');
  }

  // testSeq 또는 testId로 시험 찾기
  let resolvedTestId = testId;
  if (!resolvedTestId && testSeq) {
    const test = await prisma.test.findUnique({ where: { seq: Number(testSeq) } });
    if (!test) {
      return notFound('시험을 찾을 수 없습니다');
    }
    resolvedTestId = test.id;
  }
  if (!resolvedTestId) {
    return badRequest('시험을 선택해주세요');
  }

  // 학생 존재 확인
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== 'STUDENT') {
    return notFound('학생을 찾을 수 없습니다');
  }

  const { attempt, resumed } = await createManualAttempt({
    testId: resolvedTestId,
    studentId,
    teacherId: user.id,
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
