import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse, serverError } from '@/lib/api';
import { getTodayHomework } from '@/lib/services/homework';

/** GET: 학생의 오늘 숙제 */
export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  try {
    const homework = await getTodayHomework(user.id);
    return NextResponse.json({ data: homework });
  } catch (err) {
    console.error('오늘의 숙제 조회 오류:', err);
    return serverError('서버 오류가 발생했습니다');
  }
}
