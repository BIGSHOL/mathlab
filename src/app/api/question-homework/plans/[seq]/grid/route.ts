import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getQuestionHomeworkGrid } from '@/lib/services/question-homework';

type Params = { params: Promise<{ seq: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 });
  }

  const { seq } = await params;
  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade') ? Number(searchParams.get('grade')) : undefined;

  try {
    const grid = await getQuestionHomeworkGrid(Number(seq), { grade });
    return NextResponse.json({ data: grid });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '플랜을 찾을 수 없습니다' } }, { status: 404 });
  }
}
