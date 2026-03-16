import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, validateBody, requireResource } from '@/lib/api';
import { blankPageSubmitSchema } from '@/lib/schemas/learning';
import { XP_REWARDS } from '@/lib/utils/xp';

// POST /api/learning/blank-page-submit
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, blankPageSubmitSchema);
  if (isResponse(parsed)) return parsed;

  const concept = await requireResource(
    () => prisma.concept.findUnique({ where: { id: parsed.conceptId } }),
    '개념을 찾을 수 없습니다'
  );
  if (isResponse(concept)) return concept;

  // Simple scoring: check content length and keyword overlap
  const keywords = concept.fullContent
    .replace(/[#*\n\r]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const contentWords = parsed.content.split(/\s+/);
  const matchCount = contentWords.filter((w) =>
    keywords.some((k) => k.includes(w) || w.includes(k))
  ).length;
  const score = Math.min(100, Math.round((matchCount / Math.max(keywords.length * 0.3, 1)) * 100));
  const passed = score >= 70;

  // Record progress
  await prisma.learningProgress.upsert({
    where: {
      userId_conceptId_stage: { userId: user.id, conceptId: parsed.conceptId, stage: 'BLANK_PAGE' },
    },
    update: {
      score,
      completed: passed,
      completedAt: passed ? new Date() : null,
      attempts: { increment: 1 },
      submittedText: parsed.content,
    },
    create: {
      userId: user.id,
      conceptId: parsed.conceptId,
      stage: 'BLANK_PAGE',
      score,
      completed: passed,
      completedAt: passed ? new Date() : null,
      attempts: 1,
      submittedText: parsed.content,
    },
  });

  const xpAwarded = passed ? XP_REWARDS.BLANK_PAGE : 0;

  return NextResponse.json({
    data: {
      score,
      passed,
      feedback: passed
        ? '훌륭합니다! 핵심 개념을 잘 이해하고 있습니다.'
        : '일부 핵심 내용이 빠져있습니다. 다시 복습해보세요.',
      xpAwarded,
    },
  });
}
