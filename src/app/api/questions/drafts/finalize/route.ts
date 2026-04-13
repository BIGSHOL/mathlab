import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, serverError } from '@/lib/api';

/** POST /api/questions/drafts/finalize { batchId } — 드래프트를 정식 문제로 전환 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json().catch(() => ({}));
  const batchId = body?.batchId;
  if (!batchId || typeof batchId !== 'string') return badRequest('batchId가 필요합니다');

  try {
    const updated = await prisma.question.updateMany({
      where: { draftBatchId: batchId, draftOwnerId: user.id, isDraft: true },
      data: { isDraft: false, draftBatchId: null, draftOwnerId: null },
    });
    return NextResponse.json({ data: { finalized: updated.count } });
  } catch (err) {
    console.error('[drafts finalize]', err);
    return serverError('드래프트 확정 실패');
  }
}
