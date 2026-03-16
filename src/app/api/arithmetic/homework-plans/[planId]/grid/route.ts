import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse } from '@/lib/api';
import { getHomeworkGrid } from '@/lib/services/homework';

/** GET: 월 숙제부 그리드 데이터 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { planId } = await params;
  const seq = Number(planId);
  const { searchParams } = new URL(request.url);
  const gradeParam = searchParams.get('grade');

  try {
    const grid = await getHomeworkGrid(seq, {
      grade: gradeParam ? Number(gradeParam) : undefined,
    });
    return NextResponse.json({ data: grid });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: (err as Error).message } },
      { status: 400 }
    );
  }
}
