import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter } from '@/lib/api';

/** GET /api/exam-analysis/nearby-count?schoolId=xxx&grade=중3&examPaperId=yyy
 *  - yearCount: 같은 학교 + 같은 학년 + 다른 연도 (현재 시험 제외)
 *  - nearbyCount: 주변 학교 + 같은 학년 + 같은 연도 + 같은 학기/시험종류
 */
export async function GET(req: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const schoolId = req.nextUrl.searchParams.get('schoolId') || '';
  const grade = req.nextUrl.searchParams.get('grade') || '';
  const examPaperId = req.nextUrl.searchParams.get('examPaperId') || '';

  if (!schoolId) {
    return NextResponse.json({ data: { nearbyCount: 0, yearCount: 0 } });
  }

  try {
    // 현재 시험의 title에서 연도/학기/시험종류 추출
    let examYear: string | null = null;
    let examSemester: string | null = null;
    let examExamType: string | null = null;

    if (examPaperId) {
      const currentPaper = await prisma.examPaper.findUnique({
        where: { id: examPaperId },
        select: { title: true },
      });
      if (currentPaper?.title) {
        const yearMatch = currentPaper.title.match(/(20\d{2})년/);
        if (yearMatch) examYear = yearMatch[1];
        const semMatch = currentPaper.title.match(/(\d)학기\s*(중간|기말|모의)/);
        if (semMatch) {
          examSemester = semMatch[1];
          examExamType = semMatch[2];
        }
      }
    }

    const tenantWhere = getTenantFilter(user);

    // 1. 연도 비교: 같은 학교 + 같은 학년 + 같은 학기/시험종류 + 다른 연도
    let yearCount = 0;
    {
      const sameschoolPapers = await prisma.examPaper.findMany({
        where: {
          ...tenantWhere,
          schoolId,
          grade: grade || undefined,
          id: examPaperId ? { not: examPaperId } : undefined,
          status: 'COMPLETED',
        },
        select: { title: true },
      });
      for (const p of sameschoolPapers) {
        if (!p.title) continue;
        if (examSemester && examExamType) {
          const s = p.title.match(/(\d)학기\s*(중간|기말|모의)/);
          if (!s || s[1] !== examSemester || s[2] !== examExamType) continue;
        }
        if (examYear) {
          const y = p.title.match(/(20\d{2})년/);
          if (y && y[1] === examYear) continue;
        }
        yearCount++;
      }
    }

    // 2. 주변 비교: 같은 그룹 학교 + 같은 학년 + 같은 연도
    let nearbyCount = 0;
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { nearbyGroupId: true },
    });

    if (school?.nearbyGroupId) {
      const groupSchools = await prisma.school.findMany({
        where: { nearbyGroupId: school.nearbyGroupId, id: { not: schoolId } },
        select: { id: true },
      });
      if (groupSchools.length > 0) {
        const candidates = await prisma.examPaper.findMany({
          where: {
            ...tenantWhere,
            schoolId: { in: groupSchools.map(s => s.id) },
            grade: grade || undefined,
            status: 'COMPLETED',
          },
          select: { schoolId: true, title: true },
        });

        const matchedSchoolIds = new Set<string>();
        for (const p of candidates) {
          if (!p.schoolId || !p.title) continue;
          if (examYear) {
            const y = p.title.match(/(20\d{2})년/);
            if (!y || y[1] !== examYear) continue;
          }
          if (examSemester && examExamType) {
            const s = p.title.match(/(\d)학기\s*(중간|기말|모의)/);
            if (!s || s[1] !== examSemester || s[2] !== examExamType) continue;
          }
          matchedSchoolIds.add(p.schoolId);
        }
        nearbyCount = matchedSchoolIds.size;
      }
    }

    return NextResponse.json({ data: { nearbyCount, yearCount } });
  } catch (error) {
    console.error('[exam-analysis nearby-count GET] 주변 학교 조회 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '주변 학교 비교 데이터를 불러오는 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
