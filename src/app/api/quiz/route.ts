import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, getTenantFilter } from '@/lib/api';
import { parseStringIds, getTestQuestionIds } from '@/lib/utils/question-order';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** GET: 퀴즈 세션 목록 (교사용) */
export async function GET() {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const tenantWhere = getTenantFilter(currentUser);

  const sessions = await prisma.quizSession.findMany({
    where: { hostId: currentUser.id, ...tenantWhere },
    include: { _count: { select: { participants: true, sessionQuestions: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ data: sessions });
}

/** POST: 퀴즈 세션 생성 */
export async function POST(request: NextRequest) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const body = await request.json();
  const { title, testId } = body;
  let { questionIds } = body;

  if (!title) {
    return badRequest('제목을 입력하세요');
  }

  // testId 기반 생성: 중간테이블 헬퍼로 questionIds 조회 (deprecated Json 의존 제거)
  if (testId && (!questionIds || !questionIds.length)) {
    questionIds = await getTestQuestionIds(testId);
  }

  if (!questionIds?.length) {
    return badRequest('문제를 선택하세요');
  }

  // Generate unique join code
  let joinCode = generateJoinCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.quizSession.findUnique({ where: { joinCode } });
    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.quizSession.create({
      data: {
        title,
        hostId: currentUser.id,
        joinCode,
        tenantId: currentUser.viewingTenantId ?? currentUser.tenantId,
      },
    });

    // 중간테이블 기록 (questionIds Json 컬럼 제거 후 단일 진실의 원천)
    await tx.quizSessionQuestion.createMany({
      data: parseStringIds(questionIds).map((qId, idx) => ({
        sessionId: created.id,
        questionId: qId,
        sortOrder: idx,
      })),
    });

    return created;
  });

  return NextResponse.json({ data: session });
}
