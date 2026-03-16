import { NextResponse } from 'next/server';
import { requireAuth, isResponse, serverError } from '@/lib/api';
import { getTodayHomework } from '@/lib/services/homework';

/** GET: 학생의 오늘 숙제 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  try {
    const homework = await getTodayHomework(user.id);
    return NextResponse.json({ data: homework });
  } catch (err) {
    return serverError((err as Error).message);
  }
}
