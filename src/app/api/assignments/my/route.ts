import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMyAssignments } from '@/lib/services/assignment';

/** GET: 학생의 배정 목록 */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '학생만 조회할 수 있습니다' } },
      { status: 403 }
    );
  }

  const assignments = await getMyAssignments(currentUser.id);

  return NextResponse.json({ data: assignments });
}
