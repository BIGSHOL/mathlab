/**
 * PDF 추출 드래프트 관리
 *
 * GET    /api/questions/drafts                — 본인의 미완료 드래프트 배치 목록
 * POST   /api/questions/drafts/finalize       — { batchId } 드래프트를 정식 문제로 전환
 * POST   /api/questions/drafts/discard        — { batchId } 드래프트를 삭제
 *
 * PDF 추출 중 브라우저 크래시/시스템 다운이 발생해도 이미 추출된 문제는 DB에 draft로 보존되므로
 * 재접속 시 이어하기 또는 정리 가능.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, serverError } from '@/lib/api';

export async function GET(_request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  try {
    const drafts = await prisma.question.groupBy({
      by: ['draftBatchId'],
      where: { isDraft: true, draftOwnerId: user.id, draftBatchId: { not: null } },
      _count: true,
      _min: { createdAt: true },
      _max: { createdAt: true },
    });

    const data = drafts
      .filter((d) => d.draftBatchId)
      .map((d) => ({
        batchId: d.draftBatchId!,
        count: d._count,
        firstAt: d._min.createdAt,
        lastAt: d._max.createdAt,
      }))
      .sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[drafts GET]', err);
    return serverError('드래프트 목록 조회 실패');
  }
}
