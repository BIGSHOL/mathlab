import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { blankSubmitSchema } from '@/lib/schemas/learning';
import { XP_REWARDS, calculateLevel } from '@/lib/utils/xp';

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
  const stage = exercise.level === 1 ? 'BLANK_EASY' : 'BLANK_HARD';
  const xpAwarded = allCorrect
    ? exercise.level === 1
      ? XP_REWARDS.BLANK_EASY
      : XP_REWARDS.BLANK_HARD
    : 0;

  // Record progress + award XP in a transaction
  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / results.length) * 100);

  await prisma.$transaction(async (tx) => {
    await tx.learningProgress.upsert({
      where: {
        userId_conceptId_stage: { userId: currentUser.id, conceptId: exercise.conceptId, stage },
      },
      update: {
        score,
        completed: allCorrect,
        completedAt: allCorrect ? new Date() : null,
        attempts: { increment: 1 },
      },
      create: {
        userId: currentUser.id,
        conceptId: exercise.conceptId,
        stage,
        score,
        completed: allCorrect,
        completedAt: allCorrect ? new Date() : null,
        attempts: 1,
      },
    });

    if (xpAwarded > 0) {
      await tx.pointTransaction.create({
        data: {
          userId: currentUser.id,
          amount: xpAwarded,
          type: 'EARN',
          reason: stage,
          referenceId: exercise.id,
        },
      });

      const profile = await tx.studentProfile.upsert({
        where: { userId: currentUser.id },
        update: { totalXp: { increment: xpAwarded }, lastActiveAt: new Date() },
        create: { userId: currentUser.id, totalXp: xpAwarded, lastActiveAt: new Date() },
      });

      const newLevel = calculateLevel(profile.totalXp);
      if (newLevel !== profile.level) {
        await tx.studentProfile.update({
          where: { userId: currentUser.id },
          data: { level: newLevel },
        });
      }
    }
  });

  return NextResponse.json({
    data: { correct: allCorrect, results, allCorrect, xpAwarded },
  });
}
