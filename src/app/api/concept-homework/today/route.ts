import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTodayConceptHomework } from '@/lib/services/concept-homework';

/** GET: 학생의 오늘 개념 숙제 */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  const homework = await getTodayConceptHomework(currentUser.id);
  return NextResponse.json({ data: homework });
}
