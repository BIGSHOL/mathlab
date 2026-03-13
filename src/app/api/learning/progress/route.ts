import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { completeStageSchema } from '@/lib/schemas/learning';
import { XP_REWARDS, calculateLevel } from '@/lib/utils/xp';

// GET /api/learning/progress?conceptId=xxx
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  const conceptId = new URL(request.url).searchParams.get('conceptId');
  const where: Record<string, unknown> = { userId: currentUser.id };
  if (conceptId) where.conceptId = conceptId;

  const progress = await prisma.learningProgress.findMany({
    where,
    select: {
      id: true, conceptId: true, stage: true, completed: true,
      score: true, completedAt: true, startedAt: true, updatedAt: true, attempts: true,
    },
    orderBy: { startedAt: 'asc' },
  });

  return NextResponse.json({ data: progress });
}

const STAGE_XP: Record<string, number> = {
  READING: XP_REWARDS.READING_COMPLETE,
  BLANK_EASY: XP_REWARDS.BLANK_EASY,
  BLANK_HARD: XP_REWARDS.BLANK_HARD,
  BLANK_FULL: XP_REWARDS.BLANK_FULL,
  BLANK_PAGE: XP_REWARDS.BLANK_PAGE,
};

// POST /api/learning/progress - Complete a stage
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  const body = await request.json();
  const parsed = completeStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' } },
      { status: 400 }
    );
  }

  const { conceptId, stage } = parsed.data;
  const xpAmount = STAGE_XP[stage] ?? 0;

  // Upsert learning progress + award XP (atomic)
  const progress = await prisma.$transaction(async (tx) => {
    const prog = await tx.learningProgress.upsert({
      where: {
        userId_conceptId_stage: { userId: currentUser.id, conceptId, stage },
      },
      update: {
        completed: true,
        completedAt: new Date(),
        attempts: { increment: 1 },
      },
      create: {
        userId: currentUser.id,
        conceptId,
        stage,
        completed: true,
        completedAt: new Date(),
        attempts: 1,
      },
    });

    if (xpAmount > 0) {
      await tx.pointTransaction.create({
        data: {
          userId: currentUser.id,
          amount: xpAmount,
          type: 'EARN',
          reason: stage,
          referenceId: prog.id,
        },
      });

      const profile = await tx.studentProfile.upsert({
        where: { userId: currentUser.id },
        update: {
          totalXp: { increment: xpAmount },
          lastActiveAt: new Date(),
        },
        create: {
          userId: currentUser.id,
          totalXp: xpAmount,
          lastActiveAt: new Date(),
        },
      });

      const newLevel = calculateLevel(profile.totalXp);
      if (newLevel !== profile.level) {
        await tx.studentProfile.update({
          where: { userId: currentUser.id },
          data: { level: newLevel },
        });
      }
    }

    return prog;
  });

  return NextResponse.json({
    data: {
      id: progress.id,
      stage: progress.stage,
      completed: true,
      xpAwarded: xpAmount,
    },
  });
}
