import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, notFound } from '@/lib/api';
import { deleteManualAnswer } from '@/lib/services/manual-grading';

/** DELETE — 답안 삭제 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ attemptId: string; questionId: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { attemptId, questionId } = await params;

  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.entryMethod !== 'manual') {
    return notFound('수기 채점을 찾을 수 없습니다');
  }
  if (attempt.completedAt) {
    return badRequest('이미 완료된 채점입니다');
  }

  await deleteManualAnswer(attemptId, questionId);

  return NextResponse.json({ data: { deleted: true } });
}
