import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, serverError } from '@/lib/api';

/** POST /api/questions/drafts/discard { batchId } — 드래프트를 삭제 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json().catch(() => ({}));
  const batchId = body?.batchId;
  if (!batchId || typeof batchId !== 'string') return badRequest('batchId가 필요합니다');

  try {
    const deleted = await prisma.question.deleteMany({
      where: { draftBatchId: batchId, draftOwnerId: user.id, isDraft: true },
    });
    return NextResponse.json({ data: { discarded: deleted.count } });
  } catch (err) {
    console.error('[drafts discard]', err);
    return serverError('드래프트 삭제 실패');
  }
}
