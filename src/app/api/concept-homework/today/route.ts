import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { getTodayConceptHomework } from '@/lib/services/concept-homework';

/** GET: 학생의 오늘 개념 숙제 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const homework = await getTodayConceptHomework(user.id);
  return NextResponse.json({ data: homework });
}
