import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse } from '@/lib/api';

type GridFetcher = (seq: number, options: { grade?: number }) => Promise<unknown>;
type RouteParams = { params: Promise<Record<string, string>> };

/**
 * 숙제 그리드 GET 핸들러 팩토리
 * — 3종 숙제(arithmetic, concept, question)의 grid 라우트가 동일 패턴이므로 공통화
 */
export function createGridHandler(getGridFn: GridFetcher, paramKey = 'seq') {
  return async function GET(request: NextRequest, { params }: RouteParams) {
    const user = await requireTeacher();
    if (isResponse(user)) return user;

    const resolved = await params;
    const seq = Number(resolved[paramKey]);
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade') ? Number(searchParams.get('grade')) : undefined;

    try {
      const grid = await getGridFn(seq, { grade });
      return NextResponse.json({ data: grid });
    } catch (err) {
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: (err as Error).message } },
        { status: 400 }
      );
    }
  };
}
