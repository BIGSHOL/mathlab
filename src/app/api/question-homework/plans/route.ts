import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest, clamp, homeworkCreatedByFilter } from '@/lib/api';
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
      tenantId: user.viewingTenantId ?? user.tenantId,
      startDate,
      questionIds,
      questionsPerDay: clamp(questionsPerDay || 5, 1, 30),
      passingScore: clamp(passingScore ?? 80, 0, 100),
      studentIds: studentIds || [],
    });
    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (err) {
    console.error('문제 숙제 플랜 생성 오류:', err);
    return badRequest('문제 숙제 플랜 생성에 실패했습니다');
  }
}

export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const createdBy = homeworkCreatedByFilter(user);
  const plans = await listQuestionHomeworkPlans(createdBy);
  return NextResponse.json({ data: plans });
}
