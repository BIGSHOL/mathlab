import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 실제 라우트(/api/exam-analysis/[id]/questions/[questionNumber])와 동일 스키마
const patchSchema = z.object({
  topic: z.string().max(200).optional(),
  confidence: z.number().min(0).max(1).optional(),
  difficulty: z.enum(['1', '2', '3', '4', '5']).optional(),
  points: z.number().min(0).max(100).optional(),
  question_type: z.enum(['number', 'algebra', 'function', 'geometry', 'statistics']).optional(),
  ability_domain: z.enum(['calculation', 'understanding', 'problem_solving', 'reasoning']).optional(),
});

type Params = { params: Promise<{ questionNumber: string }> };

/**
 * 데모 — 문항 인라인 교정 echo (인증·DB 없음).
 * 공개 /demo에서 난이도/배점/단원 교정 UX를 체험하게 한다. 실제 저장은 하지 않고
 * 성공 형태({ data: { question } })만 돌려줘 클라이언트 로컬 상태가 갱신되게 함.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { questionNumber } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '입력값이 올바르지 않습니다' } },
      { status: 400 },
    );
  }
  return NextResponse.json({
    data: {
      question: {
        question_number: questionNumber,
        ...parsed.data,
        manually_edited: true,
        manually_edited_at: new Date().toISOString(),
        demo: true,
      },
    },
  });
}
