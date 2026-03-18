import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse } from '@/lib/api';
import { getTodayConceptHomework } from '@/lib/services/concept-homework';

/** GET: 학생의 오늘 개념 숙제 */
export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const homework = await getTodayConceptHomework(user.id);
  return NextResponse.json({ data: homework });
}
