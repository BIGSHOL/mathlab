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
    orderBy: { startedAt: 'asc' },
  });

  return NextResponse.json({ data: progress });
}

const STAGE_XP: Record<string, number> = {
  READING: XP_REWARDS.READING_COMPLETE,
  BLANK_EASY: XP_REWARDS.BLANK_EASY,
  BLANK_HARD: XP_REWARDS.BLANK_HARD,
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

  // Upsert learning progress
  const progress = await prisma.learningProgress.upsert({
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

  // Award XP
  if (xpAmount > 0) {
    await prisma.pointTransaction.create({
      data: {
        userId: currentUser.id,
        amount: xpAmount,
        type: 'EARN',
        reason: stage,
        referenceId: progress.id,
      },
    });

    const profile = await prisma.studentProfile.upsert({
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

    // Update level
    const newLevel = calculateLevel(profile.totalXp);
    if (newLevel !== profile.level) {
      await prisma.studentProfile.update({
        where: { userId: currentUser.id },
        data: { level: newLevel },
      });
    }
  }

  return NextResponse.json({
    data: {
      id: progress.id,
      stage: progress.stage,
      completed: true,
      xpAwarded: xpAmount,
    },
  });
}
