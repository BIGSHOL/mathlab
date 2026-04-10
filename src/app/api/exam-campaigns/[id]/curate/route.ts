/**
 * 캠페인 큐레이션 재실행
 *
 * POST /api/exam-campaigns/:id/curate — 인근 학교 기출/패턴 재집계
 *
 * 시험범위 변경 후 큐레이션을 다시 돌려야 할 때 호출.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  notFound,
  serverError,
  getTenantFilter,
} from '@/lib/api';
import { runCurationAndActivate } from '@/lib/services/exam-campaign-curator';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const tenantWhere = getTenantFilter(user);

  const existing = await prisma.examCampaign.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true },
  });
  if (!existing) return notFound('캠페인을 찾을 수 없습니다');

  try {
    // 큐레이션 중에는 PREPARING으로 표시
    await prisma.examCampaign.update({
      where: { id },
      data: { status: 'PREPARING' },
    });
    const result = await runCurationAndActivate(id);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[exam-campaigns curate]', err);
    return serverError('큐레이션 재실행에 실패했습니다');
  }
}
