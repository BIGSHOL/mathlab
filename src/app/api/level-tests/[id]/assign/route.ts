import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assignTest } from '@/lib/services/assignment';
import { requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';

/** POST: 레벨테스트를 학생들에게 배정 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id } = await params;
  const seq = Number(id);

  if (isNaN(seq)) {
    return badRequest('잘못된 시험 번호입니다');
  }

  const test = await prisma.test.findUnique({ where: { seq }, select: { id: true } });
  if (!test) {
    return notFound('레벨테스트를 찾을 수 없습니다');
  }

  const body = await request.json();
  const { studentIds, dueDate, allowLateSubmission } = body;

  if (!studentIds?.length) {
    return badRequest('학생을 1명 이상 선택하세요');
  }

  const result = await assignTest({ testId: test.id, studentIds, dueDate, allowLateSubmission });

  return NextResponse.json({ data: result }, { status: 201 });
}
