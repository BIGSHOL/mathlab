import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assignTest } from '@/lib/services/assignment';

/** POST: 레벨테스트를 학생들에게 배정 */
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

  const { id: testId } = await params;
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
