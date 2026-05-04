import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  badRequest,
  notFound,
  getTenantFilter,
  requireTenantFeature,
  serverError,
} from '@/lib/api';
import { updateWorkbookSchema } from '@/lib/schemas/workbook';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function findWorkbookOrNull(id: string, tenantWhere: Record<string, unknown>) {
  return prisma.workbook.findFirst({
    where: { id, ...tenantWhere },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              question: {
                select: { id: true, bookCode: true, chapter: true, section: true, questionNum: true, content: true, difficulty: true },
              },
              test: { select: { id: true, title: true, questionCount: true, grade: true } },
              concept: { select: { id: true, title: true, conceptCode: true, chapter: true, section: true } },
              examPaper: { select: { id: true, title: true, schoolName: true, grade: true } },
              arithmeticPlan: { select: { id: true, title: true, totalDays: true } },
              homeworkPlan: { select: { id: true, title: true, totalDays: true } },
            },
          },
        },
      },
      creator: { select: { name: true } },
    },
  });
}

export async function GET(_req: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const licenseCheck = await requireTenantFeature(user, 'workbook');
  if (licenseCheck) return licenseCheck;

  const { id } = await ctx.params;
  const workbook = await findWorkbookOrNull(id, getTenantFilter(user));
  if (!workbook) return notFound('워크북을 찾을 수 없습니다');

  return NextResponse.json({ data: workbook });
}

export async function PATCH(request: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const licenseCheck = await requireTenantFeature(user, 'workbook');
  if (licenseCheck) return licenseCheck;

  const { id } = await ctx.params;
  const tenantWhere = getTenantFilter(user);
  const existing = await prisma.workbook.findFirst({ where: { id, ...tenantWhere }, select: { id: true } });
  if (!existing) return notFound('워크북을 찾을 수 없습니다');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON 파싱에 실패했습니다');
  }

  const parsed = updateWorkbookSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값이 올바르지 않습니다', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  try {
    const workbook = await prisma.workbook.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ data: workbook });
  } catch (e) {
    console.error('[workbooks PATCH]', e);
    return serverError('워크북 수정에 실패했습니다');
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const licenseCheck = await requireTenantFeature(user, 'workbook');
  if (licenseCheck) return licenseCheck;

  const { id } = await ctx.params;
  const tenantWhere = getTenantFilter(user);
  const existing = await prisma.workbook.findFirst({ where: { id, ...tenantWhere }, select: { id: true } });
  if (!existing) return notFound('워크북을 찾을 수 없습니다');

  try {
    await prisma.workbook.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (e) {
    console.error('[workbooks DELETE]', e);
    return serverError('워크북 삭제에 실패했습니다');
  }
}
