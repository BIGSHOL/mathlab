import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTodayQuestionHomework } from '@/lib/services/question-homework';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  const homework = await getTodayQuestionHomework(currentUser.id);
  return NextResponse.json({ data: homework });
}
