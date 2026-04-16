import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { generateTutorAnswer } from '@/lib/services/ai-tutor';

/** Rate limit: 문제당 최대 3회 (사용자 기준) */
const MAX_PER_QUESTION = 3;

/**
 * POST /api/learning/ai-tutor
 * Body: { questionId, studentAnswer, studentQuestion? }
 * 응답: { answer }
 */
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const body = await request.json().catch(() => ({}));
  const { questionId, studentAnswer, studentQuestion } = body as {
    questionId?: string;
    studentAnswer?: string;
    studentQuestion?: string;
  };

  if (!questionId || typeof questionId !== 'string') {
    return badRequest('questionId가 필요합니다');
  }

  if (typeof studentAnswer !== 'string') {
    return badRequest('studentAnswer가 필요합니다');
  }

  // Rate limit 체크
  const existingCount = await prisma.tutorChatLog.count({
    where: { userId: user.id, questionId },
  });
  if (existingCount >= MAX_PER_QUESTION) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMIT', message: `이 문제에 대한 질문은 ${MAX_PER_QUESTION}회까지만 가능합니다` } },
      { status: 429 },
    );
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      content: true,
      explanation: true,
      answer: true,
      choices: true,
      difficulty: true,
      chapter: true,
    },
  });

  if (!question) {
    return badRequest('문제를 찾을 수 없습니다');
  }

  // choices 정규화 (Json → string[])
  let choicesArr: string[] | null = null;
  if (Array.isArray(question.choices)) {
    choicesArr = (question.choices as unknown[]).map((c) => String(c));
  }

  const result = await generateTutorAnswer({
    content: question.content,
    explanation: question.explanation,
    answer: question.answer,
    choices: choicesArr,
    studentAnswer,
    studentQuestion,
    difficulty: question.difficulty,
    chapter: question.chapter ?? undefined,
  });

  // 로그 저장 (fire-and-forget OK)
  await prisma.tutorChatLog.create({
    data: {
      userId: user.id,
      questionId,
      studentQ: studentQuestion || `제가 쓴 답: ${studentAnswer}`,
      aiAnswer: result.answer,
    },
  });

  return NextResponse.json({
    data: {
      answer: result.answer,
      remaining: Math.max(0, MAX_PER_QUESTION - existingCount - 1),
    },
  });
}
