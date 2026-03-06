import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { blankSubmitSchema } from '@/lib/schemas/learning';
import { XP_REWARDS } from '@/lib/utils/xp';

interface BlankItem {
  position: number;
  answer: string;
  hint: string;
}

// POST /api/learning/blank-submit
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  const body = await request.json();
  const parsed = blankSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' } },
      { status: 400 }
    );
  }

  const exercise = await prisma.blankExercise.findUnique({
    where: { id: parsed.data.exerciseId },
  });

  if (!exercise) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const blanks = exercise.blanks as unknown as BlankItem[];

  const results = parsed.data.answers.map((a) => {
    const blank = blanks.find((b) => b.position === a.position);
    const isCorrect = blank?.answer.trim().toLowerCase() === a.value.trim().toLowerCase();
    return {
      position: a.position,
      correct: isCorrect,
      expected: blank?.answer ?? '',
      submitted: a.value,
    };
  });

  const allCorrect = results.every((r) => r.correct);
  const xpAwarded = allCorrect
    ? exercise.level === 1
      ? XP_REWARDS.BLANK_EASY
      : XP_REWARDS.BLANK_HARD
    : 0;

  return NextResponse.json({
    data: { correct: allCorrect, results, allCorrect, xpAwarded },
  });
}
