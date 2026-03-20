import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, notFound } from '@/lib/api';
import { getTestQuestionIds } from '@/lib/utils/question-order';

/** GET — 수기 채점 진행상황 조회 (이어하기) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { attemptId } = await params;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      student: { select: { id: true, name: true, username: true, grade: true } },
      test: { include: { levelTestConfig: true } },
    },
  });

  if (!attempt || attempt.entryMethod !== 'manual') {
    return notFound('수기 채점을 찾을 수 없습니다');
  }

  // 시험 문제 목록 (중간테이블 우선)
  const questionIds = await getTestQuestionIds(attempt.test.id);
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
    },
  });
}
