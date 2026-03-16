import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, notFound } from '@/lib/api';
import { getQuestionHomeworkGrid } from '@/lib/services/question-homework';

type Params = { params: Promise<{ seq: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade') ? Number(searchParams.get('grade')) : undefined;

  try {
    const grid = await getQuestionHomeworkGrid(Number(seq), { grade });
    return NextResponse.json({ data: grid });
  } catch {
    return notFound('플랜을 찾을 수 없습니다');
  }
}
