import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest, clamp, homeworkCreatedByFilter } from '@/lib/api';
import { createConceptHomeworkPlan, listConceptHomeworkPlans } from '@/lib/services/concept-homework';
import { Stage } from '@prisma/client';

/** POST: 개념 숙제 플랜 생성 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { title, startDate, conceptIds, conceptsPerDay, requiredStage, studentIds } = body;

  if (!title?.trim()) {
    return badRequest('제목을 입력하세요');
  }

  if (!Array.isArray(conceptIds) || conceptIds.length === 0) {
    return badRequest('개념을 1개 이상 선택하세요');
  }

  const validStages: Stage[] = [Stage.READING, Stage.BLANK_EASY, Stage.BLANK_HARD, Stage.BLANK_FULL];

  try {
    const plan = await createConceptHomeworkPlan({
      title: title.trim(),
      createdBy: user.id,
      startDate,
      conceptIds,
      conceptsPerDay: clamp(conceptsPerDay || 1, 1, 10),
      requiredStage: validStages.includes(requiredStage) ? requiredStage : Stage.BLANK_FULL,
      studentIds: studentIds || [],
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (err) {
    console.error('개념 숙제 플랜 생성 오류:', err);
    return badRequest('개념 숙제 플랜 생성에 실패했습니다');
  }
}

/** GET: 개념 숙제 플랜 목록 */
export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const createdBy = homeworkCreatedByFilter(user);
  const plans = await listConceptHomeworkPlans(createdBy);

  return NextResponse.json({ data: plans });
}
