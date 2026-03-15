import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTodayHomework } from '@/lib/services/homework';

/** GET: 학생의 오늘 숙제 */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  try {
    const homework = await getTodayHomework(currentUser.id);
    return NextResponse.json({ data: homework });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
