import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, notFound } from '@/lib/api';
import { getConceptHomeworkGrid } from '@/lib/services/concept-homework';

type Params = { params: Promise<{ seq: string }> };

/** GET: 개념 숙제 그리드 데이터 */
export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade') ? Number(searchParams.get('grade')) : undefined;

  try {
    const grid = await getConceptHomeworkGrid(Number(seq), { grade });
    return NextResponse.json({ data: grid });
  } catch {
    return notFound('플랜을 찾을 수 없습니다');
  }
}
