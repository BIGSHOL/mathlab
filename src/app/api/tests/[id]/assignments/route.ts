import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTestAssignments } from '@/lib/services/assignment';
import { prisma } from '@/lib/db';

/** GET: 시험별 배정 현황 조회 (교사용) */
export async function GET(
  _request: NextRequest,
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

  const assignments = await getTestAssignments(testId);

  return NextResponse.json({ data: assignments });
}

/** DELETE: 배정 취소 */
export async function DELETE(
  request: NextRequest,
  _ctx: { params: Promise<{ id: string }> } // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get('assignmentId');

  if (!assignmentId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'assignmentId가 필요합니다' } },
      { status: 400 }
    );
  }

  await prisma.testAssignment.delete({ where: { id: assignmentId } });

  return NextResponse.json({ data: { success: true } });
}
