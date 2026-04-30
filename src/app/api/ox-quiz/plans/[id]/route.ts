import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, notFound, forbidden } from '@/lib/api';
import { prisma } from '@/lib/db';

/** GET: OX 숙제 플랜 단건 조회 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const plan = await prisma.oxQuizPlan.findUnique({
    where: { id },
    include: {
      enrollments: {
        select: {
          id: true,
          studentId: true,
          enrolledAt: true,
          student: { select: { id: true, name: true } },
        },
      },
      _count: { select: { attempts: true } },
      creator: { select: { name: true } },
    },
  });

  if (!plan) return notFound('OX 숙제 플랜을 찾을 수 없습니다');

  // 다른 테넌트 데이터 접근 차단 (SUPER_ADMIN 제외)
  if (
    user.role !== 'SUPER_ADMIN' &&
    plan.tenantId &&
    plan.tenantId !== (user.viewingTenantId ?? user.tenantId)
  ) {
    return forbidden('해당 숙제에 접근할 권한이 없습니다');
  }

  return NextResponse.json({ data: plan });
}

/** PATCH: 플랜 활성/비활성 토글 등 단순 업데이트 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.oxQuizPlan.findUnique({ where: { id } });
  if (!existing) return notFound('OX 숙제 플랜을 찾을 수 없습니다');
  if (
    user.role !== 'SUPER_ADMIN' &&
    existing.tenantId &&
    existing.tenantId !== (user.viewingTenantId ?? user.tenantId)
  ) {
    return forbidden('수정 권한이 없습니다');
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (typeof body.passingScore === 'number') {
    data.passingScore = Math.min(100, Math.max(0, Math.round(body.passingScore)));
  }

  const updated = await prisma.oxQuizPlan.update({
    where: { id },
    data,
  });

  return NextResponse.json({ data: updated });
}

/** DELETE: 플랜 삭제 (Cascade로 enrollments 삭제, attempts는 SetNull) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const existing = await prisma.oxQuizPlan.findUnique({ where: { id } });
  if (!existing) return notFound('OX 숙제 플랜을 찾을 수 없습니다');
  if (
    user.role !== 'SUPER_ADMIN' &&
    existing.tenantId &&
    existing.tenantId !== (user.viewingTenantId ?? user.tenantId)
  ) {
    return forbidden('삭제 권한이 없습니다');
  }

  await prisma.oxQuizPlan.delete({ where: { id } });
  return NextResponse.json({ data: { id, deleted: true } });
}
