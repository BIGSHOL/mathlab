/**
 * 기출 분석 — 단일 문항 수동 수정 API
 *
 * PATCH /api/exam-analysis/[id]/questions/[questionNumber]
 * Body: { topic?: string }
 *
 * AI가 'UNKNOWN'으로 남긴 문항을 선생님이 수동으로 단원 지정할 때 사용.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  getTenantFilter,
  badRequest,
  notFound,
} from '@/lib/api';

type Params = { params: Promise<{ id: string; questionNumber: string }> };

const patchSchema = z.object({
  topic: z.string().max(200).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id, questionNumber } = await params;
  if (!id || !questionNumber) return badRequest('파라미터가 올바르지 않습니다');

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다');

    const tenantWhere = getTenantFilter(user);
    const examPaper = await prisma.examPaper.findFirst({
      where: { id, ...tenantWhere },
      select: { id: true },
    });
    if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

    // 최신 분석 가져오기 (여러 분석 있을 수 있음 — 가장 최근 것만 수정)
    const latest = await prisma.examAnalysis.findFirst({
      where: { examPaperId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, questions: true },
    });
    if (!latest) return notFound('분석 결과가 없습니다');

    const questionsArr = Array.isArray(latest.questions)
      ? (latest.questions as unknown[])
      : [];

    // question_number 매칭 (문자열/숫자 모두 허용)
    const idx = questionsArr.findIndex((q) => {
      const item = q as Record<string, unknown>;
      return String(item.question_number) === String(questionNumber);
    });

    if (idx === -1) return notFound('해당 문항을 찾을 수 없습니다');

    const current = questionsArr[idx] as Record<string, unknown>;
    const next: Record<string, unknown> = { ...current };

    if (parsed.data.topic !== undefined) {
      next.topic = parsed.data.topic.trim() || null;
    }
    if (parsed.data.confidence !== undefined) {
      next.confidence = parsed.data.confidence;
    }
    // 수동 편집 표시
    next.manually_edited = true;
    next.manually_edited_at = new Date().toISOString();

    const updatedQuestions = [...questionsArr];
    updatedQuestions[idx] = next;

    await prisma.examAnalysis.update({
      where: { id: latest.id },
      data: { questions: updatedQuestions as never },
    });

    return NextResponse.json({ data: { question: next } });
  } catch (error) {
    console.error('[exam-analysis question PATCH] 수정 에러:', error);
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: '문항 수정에 실패했습니다' } },
      { status: 500 },
    );
  }
}
