import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';

/** GET /api/learning/revenge-suggestions — 복수전 추천 (오답 3회 이상 유형) */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  // 오답을 chapter + difficulty 별로 집계
  const wrongGroups = await prisma.$queryRaw<
    Array<{ chapter: string; difficulty: string; wrongCount: bigint }>
  >`
    SELECT q.chapter, q.difficulty::text, COUNT(DISTINCT al."questionId") as "wrongCount"
    FROM "AnswerLog" al
    JOIN "TestAttempt" ta ON ta.id = al."attemptId"
    JOIN "Question" q ON q.id = al."questionId"
    WHERE ta."studentId" = ${user.id}
      AND al."isCorrect" = false
      AND q.chapter IS NOT NULL
    GROUP BY q.chapter, q.difficulty
    HAVING COUNT(DISTINCT al."questionId") >= 3
    ORDER BY COUNT(DISTINCT al."questionId") DESC
    LIMIT 5
  `;

  const suggestions = [];

  for (const group of wrongGroups) {
    // 해당 유형에서 유사 문제 5개 추천
    const questions = await prisma.question.findMany({
      where: {
        chapter: group.chapter,
        difficulty: group.difficulty as 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST',
        type: 'MULTIPLE_CHOICE',
      },
      select: {
        id: true,
        content: true,
        choices: true,
        answer: true,
        explanation: true,
        difficulty: true,
        chapter: true,
      },
      take: 5,
    });

    if (questions.length > 0) {
      suggestions.push({
        chapter: group.chapter,
        difficulty: group.difficulty,
        wrongCount: Number(group.wrongCount),
        questions,
      });
    }
  }

  return NextResponse.json({ data: suggestions });
}
