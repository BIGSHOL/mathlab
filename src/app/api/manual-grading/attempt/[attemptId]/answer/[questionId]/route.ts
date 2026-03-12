import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deleteManualAnswer } from '@/lib/services/manual-grading';

/** DELETE — 답안 삭제 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ attemptId: string; questionId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }
  if (currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '선생님만 사용할 수 있습니다' } }, { status: 403 });
  }

  const { attemptId, questionId } = await params;

  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.entryMethod !== 'manual') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '수기 채점을 찾을 수 없습니다' } }, { status: 404 });
  }
  if (attempt.completedAt) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '이미 완료된 채점입니다' } }, { status: 400 });
  }

  await deleteManualAnswer(attemptId, questionId);

  return NextResponse.json({ data: { deleted: true } });
}
