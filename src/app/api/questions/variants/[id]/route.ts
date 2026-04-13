/**
 * 단일 변형 문제 조작
 *
 * DELETE /api/questions/variants/:id  — 특정 변형 1개 삭제
 *
 * 원본은 이 엔드포인트로 삭제할 수 없음 (variantOfId가 있는 것만 허용)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  notFound,
  badRequest,
  serverError,
} from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;

  const q = await prisma.question.findUnique({
    where: { id },
    select: { id: true, variantOfId: true, tenantId: true },
  });
  if (!q) return notFound('문제를 찾을 수 없습니다');
  if (!q.variantOfId) return badRequest('이 엔드포인트는 변형만 삭제할 수 있습니다');

  // 권한: 본인 테넌트 또는 SUPER_ADMIN
  if (user.role !== 'SUPER_ADMIN' && q.tenantId !== (user.viewingTenantId ?? user.tenantId)) {
    return badRequest('권한이 없습니다');
  }

  try {
    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (err) {
    console.error('[variant DELETE]', err);
    return serverError('변형 삭제에 실패했습니다');
  }
}
