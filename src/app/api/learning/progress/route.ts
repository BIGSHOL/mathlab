import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireAuthViewAs, isResponse, validateBody } from '@/lib/api';
import { completeStageSchema } from '@/lib/schemas/learning';
import { XP_REWARDS, calculateLevel } from '@/lib/utils/xp';
import { checkAndAdvanceCourse } from '@/lib/services/course-advance';

// GET /api/learning/progress?conceptId=xxx
export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const conceptId = new URL(request.url).searchParams.get('conceptId');
  const where: Record<string, unknown> = { userId: user.id };
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
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, completeStageSchema);
  if (isResponse(parsed)) return parsed;

  const { conceptId, stage, usedReveal } = parsed;
  const fullXp = STAGE_XP[stage] ?? 0;
  const xpAmount = usedReveal ? Math.floor(fullXp / 2) : fullXp;

  // Upsert learning progress + award XP (atomic)
  const progress = await prisma.$transaction(async (tx) => {
    const prog = await tx.learningProgress.upsert({
      where: {
        userId_conceptId_stage: { userId: user.id, conceptId, stage },
      },
      update: {
        completed: true,
        completedAt: new Date(),
        attempts: { increment: 1 },
      },
      create: {
        userId: user.id,
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
          userId: user.id,
          amount: xpAmount,
          type: 'EARN',
          reason: stage,
          referenceId: prog.id,
        },
      });

      const profile = await tx.studentProfile.upsert({
        where: { userId: user.id },
        update: {
          totalXp: { increment: xpAmount },
          lastActiveAt: new Date(),
        },
        create: {
          userId: user.id,
          totalXp: xpAmount,
          lastActiveAt: new Date(),
        },
      });

      const newLevel = calculateLevel(profile.totalXp);
      if (newLevel !== profile.level) {
        await tx.studentProfile.update({
          where: { userId: user.id },
          data: { level: newLevel },
        });
      }
    }

    // 과정 자동 진급 체크 (BLANK_FULL 완료 시)
    if (stage === 'BLANK_FULL') {
      await checkAndAdvanceCourse(tx, user.id, conceptId);
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
