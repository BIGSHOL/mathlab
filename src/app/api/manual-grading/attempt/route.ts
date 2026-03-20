import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, notFound } from '@/lib/api';
import { createManualAttempt } from '@/lib/services/manual-grading';
import { getTestQuestionIds } from '@/lib/utils/question-order';

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

  // 시험 문제 목록도 함께 반환 (중간테이블 우선)
  const questionIds = await getTestQuestionIds(resolvedTestId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true, content: true, choices: true, answer: true, explanation: true,
      difficulty: true, chapter: true, section: true, questionNum: true, domain: true,
    },
  });
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const orderedQuestions = questionIds
    .map((qid) => questionMap.get(qid))
    .filter(Boolean);

  return NextResponse.json({
    data: {
      attempt,
      questions: orderedQuestions,
      resumed,
    },
  });
}
