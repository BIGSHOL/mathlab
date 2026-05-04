import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, notFound, badRequest, getTenantFilter } from '@/lib/api';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updatePlanSchema = z.object({
  title: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  passingScore: z.number().min(0).max(100).optional(),
});

/** GET: OX 숙제 플랜 단건 조회 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const tenantWhere = getTenantFilter(user);

  const plan = await prisma.oxQuizPlan.findFirst({
    where: { id, ...tenantWhere },
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
  const tenantWhere = getTenantFilter(user);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON 파싱에 실패했습니다');
  }

  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값이 올바르지 않습니다', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const existing = await prisma.oxQuizPlan.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true },
  });
  if (!existing) return notFound('OX 숙제 플랜을 찾을 수 없습니다');

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.passingScore !== undefined) data.passingScore = Math.round(parsed.data.passingScore);

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
  const tenantWhere = getTenantFilter(user);

  const existing = await prisma.oxQuizPlan.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true },
  });
  if (!existing) return notFound('OX 숙제 플랜을 찾을 수 없습니다');

  await prisma.oxQuizPlan.delete({ where: { id } });
  return NextResponse.json({ data: { id, deleted: true } });
}
