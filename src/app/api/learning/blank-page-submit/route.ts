import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { blankPageSubmitSchema } from '@/lib/schemas/learning';
import { XP_REWARDS } from '@/lib/utils/xp';

// POST /api/learning/blank-page-submit
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  const body = await request.json();
  const parsed = blankPageSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' } },
      { status: 400 }
    );
  }

  const concept = await prisma.concept.findUnique({
    where: { id: parsed.data.conceptId },
  });

  if (!concept) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // Simple scoring: check content length and keyword overlap
  const keywords = concept.fullContent
    .replace(/[#*\n\r]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const contentWords = parsed.data.content.split(/\s+/);
  const matchCount = contentWords.filter((w) =>
    keywords.some((k) => k.includes(w) || w.includes(k))
  ).length;
  const score = Math.min(100, Math.round((matchCount / Math.max(keywords.length * 0.3, 1)) * 100));
  const passed = score >= 70;

  // Record progress
  await prisma.learningProgress.upsert({
    where: {
      userId_conceptId_stage: { userId: currentUser.id, conceptId: parsed.data.conceptId, stage: 'BLANK_PAGE' },
    },
    update: {
      score,
      completed: passed,
      completedAt: passed ? new Date() : null,
      attempts: { increment: 1 },
      submittedText: parsed.data.content,
    },
    create: {
      userId: currentUser.id,
      conceptId: parsed.data.conceptId,
      stage: 'BLANK_PAGE',
      score,
      completed: passed,
      completedAt: passed ? new Date() : null,
      attempts: 1,
      submittedText: parsed.data.content,
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
