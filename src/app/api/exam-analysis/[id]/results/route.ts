import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

/** GET /api/exam-analysis/[id]/results — 분석 결과 전체 조회 */
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  const tenantWhere = getTenantFilter(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

  const analyses = await prisma.examAnalysis.findMany({
    where: { examPaperId: id },
    include: {
      extensions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: analyses });
}
