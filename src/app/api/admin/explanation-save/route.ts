/**
 * POST /api/admin/explanation-save
 * 생성된 해설을 DB에 일괄 저장. 정답 변경 시 answer도 업데이트.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/auth';
import { isResponse } from '@/lib/api/helpers';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { items } = (await req.json()) as {
    items: { id: string; explanation: string; answer?: string }[];
  };

  if (!items?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'items가 필요합니다' } },
      { status: 400 }
    );
  }

  let saved = 0;
  let answerChanged = 0;

  for (const item of items) {
    const update: Record<string, string> = { explanation: item.explanation };
    if (item.answer) {
      update.answer = item.answer;
      answerChanged++;
    }
    await prisma.question.update({
      where: { id: item.id },
      data: update,
    });
    saved++;
  }

  return NextResponse.json({
    data: { saved, answerChanged, total: items.length },
  });
}
