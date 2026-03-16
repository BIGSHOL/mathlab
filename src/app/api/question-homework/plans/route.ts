import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { createQuestionHomeworkPlan, listQuestionHomeworkPlans } from '@/lib/services/question-homework';

export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { title, startDate, questionIds, questionsPerDay, passingScore, studentIds } = body;

  if (!title?.trim()) {
    return badRequest('제목을 입력하세요');
  }
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return badRequest('문제를 1개 이상 선택하세요');
  }

  try {
    const plan = await createQuestionHomeworkPlan({
      title: title.trim(),
      createdBy: user.id,
      startDate,
      questionIds,
      questionsPerDay: Math.min(Math.max(1, questionsPerDay || 5), 30),
      passingScore: Math.min(Math.max(0, passingScore ?? 80), 100),
      studentIds: studentIds || [],
    });
    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (err) {
    return badRequest((err as Error).message);
  }
}

export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const createdBy = user.role === 'TEACHER' ? user.id : undefined;
  const plans = await listQuestionHomeworkPlans(createdBy);
  return NextResponse.json({ data: plans });
}
