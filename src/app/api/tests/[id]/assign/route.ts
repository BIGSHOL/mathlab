import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { assignTest } from '@/lib/services/assignment';

/** POST: 시험을 학생들에게 배정 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { id: rawId } = await params;

  // Resolve by seq (numeric) or id (cuid)
  let testId = rawId;
  const seqNum = Number(rawId);
  if (!isNaN(seqNum) && String(seqNum) === rawId) {
    const test = await prisma.test.findUnique({ where: { seq: seqNum }, select: { id: true } });
    if (!test) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '시험을 찾을 수 없습니다' } },
        { status: 404 }
      );
    }
    testId = test.id;
  }

  const body = await request.json();
  const { studentIds, dueDate, allowLateSubmission } = body;

  if (!studentIds?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '학생을 1명 이상 선택하세요' } },
      { status: 400 }
    );
  }

  const result = await assignTest({ testId, studentIds, dueDate, allowLateSubmission });

  return NextResponse.json({ data: result }, { status: 201 });
}
