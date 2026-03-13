import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createQuestionHomeworkPlan, listQuestionHomeworkPlans } from '@/lib/services/question-homework';

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 });
  }

  const body = await request.json();
  const { title, startDate, questionIds, questionsPerDay, passingScore, studentIds } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: '제목을 입력하세요' } }, { status: 400 });
  }
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: '문제를 1개 이상 선택하세요' } }, { status: 400 });
  }

  try {
    const plan = await createQuestionHomeworkPlan({
      title: title.trim(),
      createdBy: currentUser.id,
      startDate,
      questionIds,
      questionsPerDay: Math.min(Math.max(1, questionsPerDay || 5), 30),
      passingScore: Math.min(Math.max(0, passingScore ?? 80), 100),
      studentIds: studentIds || [],
    });
    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: { code: 'CREATE_FAILED', message: (err as Error).message } }, { status: 400 });
  }
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 });
  }

  const createdBy = currentUser.role === 'TEACHER' ? currentUser.id : undefined;
  const plans = await listQuestionHomeworkPlans(createdBy);
  return NextResponse.json({ data: plans });
}
