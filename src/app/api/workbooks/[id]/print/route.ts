import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  notFound,
  getTenantFilter,
} from '@/lib/api';
import { expandSectionItems } from '@/lib/services/workbook/sources';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workbooks/[id]/print
 *
 * 인쇄 페이지가 호출. 모든 섹션 + 아이템 + 어댑터로 expand한 NormalizedItem[]를 반환.
 * 클라이언트는 이 페이로드만으로 책 전체를 렌더링한다.
 */
export async function GET(_req: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await ctx.params;
  const tenantWhere = getTenantFilter(user);

  const workbook = await prisma.workbook.findFirst({
    where: { id, ...tenantWhere },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });
  if (!workbook) return notFound('워크북을 찾을 수 없습니다');

  // 각 섹션을 NormalizedItem[]로 펼친다 (병렬)
  const expandedSections = await Promise.all(
    workbook.sections.map(async (section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      startNewPage: section.startNewPage,
      sortOrder: section.sortOrder,
      items: await expandSectionItems(section.items),
    })),
  );

  return NextResponse.json({
    data: {
      workbook: {
        id: workbook.id,
        title: workbook.title,
        subtitle: workbook.subtitle,
        studentLabel: workbook.studentLabel,
        semesterLabel: workbook.semesterLabel,
        academyName: workbook.academyName,
        ownerName: workbook.ownerName,
        printPreset: workbook.printPreset,
        defaultAnswerSpace: workbook.defaultAnswerSpace,
        separateAnswerKey: workbook.separateAnswerKey,
        showToc: workbook.showToc,
        showCover: workbook.showCover,
        pageEstimates: workbook.pageEstimates,
      },
      sections: expandedSections,
    },
  });
}
