import { NextResponse } from 'next/server';
import { requireAuth, isResponse, forbidden } from '@/lib/api';
import { getMyAssignments } from '@/lib/services/assignment';

/** GET: 학생의 배정 목록 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  if (user.role !== 'STUDENT') {
    return forbidden('학생만 조회할 수 있습니다');
  }

  const assignments = await getMyAssignments(user.id);

  return NextResponse.json({ data: assignments });
}
