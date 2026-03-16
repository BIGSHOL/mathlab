import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { getTodayQuestionHomework } from '@/lib/services/question-homework';

export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const homework = await getTodayQuestionHomework(user.id);
  return NextResponse.json({ data: homework });
}
