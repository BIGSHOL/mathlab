import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, requireOwner, isResponse, getTenantFilter, badRequest } from '@/lib/api';

const VALID_FEEDBACK_TYPES = ['wrong_topic', 'wrong_difficulty', 'wrong_recognition', 'other'];

/** GET /api/exam-analysis/feedback — 피드백 목록 (OWNER+) */
export async function GET(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const feedbackType = searchParams.get('feedbackType');
  const examPaperId = searchParams.get('examPaperId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const tenantWhere = getTenantFilter(user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...tenantWhere,
    ...(status && { status }),
    ...(feedbackType && { feedbackType }),
    ...(examPaperId && { examPaperId }),
  };

  const [items, total] = await Promise.all([
    prisma.examFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.examFeedback.count({ where }),
  ]);

  return NextResponse.json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/** POST /api/exam-analysis/feedback — 피드백 생성 (TEACHER+) */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { examPaperId, analysisId, questionNumber, feedbackType, correction, comment } = body;

  if (!examPaperId) {
    return badRequest('examPaperId는 필수입니다');
  }
  if (!feedbackType || !VALID_FEEDBACK_TYPES.includes(feedbackType)) {
    return badRequest(`feedbackType은 ${VALID_FEEDBACK_TYPES.join(', ')} 중 하나여야 합니다`);
  }

  // 시험지 존재 확인
  const paper = await prisma.examPaper.findUnique({
    where: { id: examPaperId },
    select: { id: true, tenantId: true },
  });
  if (!paper) {
    return badRequest('시험지를 찾을 수 없습니다');
  }

  const feedback = await prisma.examFeedback.create({
    data: {
      tenantId: paper.tenantId,
      examPaperId,
      analysisId: analysisId || null,
      questionNumber: questionNumber ? parseInt(String(questionNumber)) : null,
      feedbackType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      correction: correction ? (JSON.parse(JSON.stringify(correction)) as any) : null,
      comment: comment || null,
      teacherId: user.id,
      status: 'pending',
    },
  });

  return NextResponse.json({ data: feedback }, { status: 201 });
}
