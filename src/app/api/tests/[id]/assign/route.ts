import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assignTest } from '@/lib/services/assignment';
import { requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';

/** POST: 시험을 학생들에게 배정 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id: rawId } = await params;

  // Resolve by seq (numeric) or id (cuid)
  let testId = rawId;
  const seqNum = Number(rawId);
  if (!isNaN(seqNum) && String(seqNum) === rawId) {
    const test = await prisma.test.findUnique({ where: { seq: seqNum }, select: { id: true } });
    if (!test) {
      return notFound('시험을 찾을 수 없습니다');
    }
    testId = test.id;
  }

  const body = await request.json();
  const { studentIds, dueDate, allowLateSubmission } = body;

  if (!studentIds?.length) {
    return badRequest('학생을 1명 이상 선택하세요');
  }

  const result = await assignTest({ testId, studentIds, dueDate, allowLateSubmission });

  return NextResponse.json({ data: result }, { status: 201 });
}
