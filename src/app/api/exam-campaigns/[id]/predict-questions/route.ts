/**
 * AI 예상 문제 생성 (Gemini)
 *
 * POST /api/exam-campaigns/:id/predict-questions
 *   body: { count?: number }  (기본 5)
 *
 * 출제 패턴 기반 예상 문제를 생성하여 Question 테이블에 저장하고
 * 캠페인 curatedQuestionIds에 추가한다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  badRequest,
  notFound,
  serverError,
  getTenantFilter,
} from '@/lib/api';
import { generatePredictedQuestions } from '@/lib/services/exam-campaign-predictor';

const bodySchema = z.object({
  count: z.number().int().min(1).max(20).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const tenantWhere = getTenantFilter(user);

  const campaign = await prisma.examCampaign.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true, status: true },
  });
  if (!campaign) return notFound('캠페인을 찾을 수 없습니다');
  if (campaign.status === 'PREPARING') return badRequest('큐레이션 완료 후 사용 가능합니다');

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* 빈 본문 허용 */
  }
  const parsed = bodySchema.safeParse(body);
  const count = parsed.success ? parsed.data.count ?? 5 : 5;

  try {
    const result = await generatePredictedQuestions({ campaignId: id, count });
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[exam-campaigns predict-questions]', err);
    return serverError('예상 문제 생성에 실패했습니다');
  }
}
