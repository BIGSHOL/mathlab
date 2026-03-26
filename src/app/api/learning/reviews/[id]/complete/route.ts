import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, badRequest, notFound } from '@/lib/api';
import { prisma } from '@/lib/db';
import { completeReview } from '@/lib/services/spaced-review';

/** POST: 복습 완료 처리 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { id } = await params;
  const body = await request.json();
  const isCorrect = body.isCorrect as boolean;
  const score = body.score as number | undefined;

  if (typeof isCorrect !== 'boolean') {
    return badRequest('isCorrect 필드가 필요합니다');
  }

  // 본인 스케줄인지 확인
  const review = await prisma.reviewSchedule.findUnique({ where: { id } });
  if (!review) return notFound('복습 스케줄을 찾을 수 없습니다');
  if (review.studentId !== user.id) return badRequest('본인의 복습만 완료할 수 있습니다');

  const nextReview = await completeReview(id, isCorrect, score);

  return NextResponse.json({
    data: {
      completed: true,
      isCorrect,
      nextReview: nextReview ? {
        id: nextReview.id,
        interval: nextReview.interval,
        reviewAt: nextReview.reviewAt.toISOString(),
      } : null, // null이면 완전 습득
    },
  });
}
