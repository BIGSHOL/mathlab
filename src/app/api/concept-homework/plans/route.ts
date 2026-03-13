import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createConceptHomeworkPlan, listConceptHomeworkPlans } from '@/lib/services/concept-homework';
import { Stage } from '@prisma/client';

/** POST: 개념 숙제 플랜 생성 */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { title, startDate, conceptIds, conceptsPerDay, requiredStage, studentIds } = body;

  if (!title?.trim()) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '제목을 입력하세요' } },
      { status: 400 }
    );
  }

  if (!Array.isArray(conceptIds) || conceptIds.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '개념을 1개 이상 선택하세요' } },
      { status: 400 }
    );
  }

  const validStages: Stage[] = [Stage.READING, Stage.BLANK_EASY, Stage.BLANK_HARD, Stage.BLANK_FULL];

  try {
    const plan = await createConceptHomeworkPlan({
      title: title.trim(),
      createdBy: currentUser.id,
      startDate,
      conceptIds,
      conceptsPerDay: Math.min(Math.max(1, conceptsPerDay || 1), 10),
      requiredStage: validStages.includes(requiredStage) ? requiredStage : Stage.BLANK_FULL,
      studentIds: studentIds || [],
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CREATE_FAILED', message: (err as Error).message } },
      { status: 400 }
    );
  }
}

/** GET: 개념 숙제 플랜 목록 */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const createdBy = currentUser.role === 'TEACHER' ? currentUser.id : undefined;
  const plans = await listConceptHomeworkPlans(createdBy);

  return NextResponse.json({ data: plans });
}
