import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter } from '@/lib/api';

/**
 * GET /api/exam-analysis/nearby-count?schoolId=xxx&grade=중3&examPaperId=yyy
 *  - yearCount: 같은 학교 + 같은 학년 + 다른 연도 (현재 시험 제외)
 *  - nearbyCount: 주변 학교 + 같은 학년 + 같은 연도 + 같은 학기/시험종류
 *
 * 비교 키(연도/학기/시험종류)는 우선순위:
 *   1) ExamPaper.examScope JSON 의 examYear/examSemester/examCategory
 *   2) title 정규식 추출 fallback
 *
 * 학교 매칭은:
 *   - 자기 학교: schoolId 일치 (없으면 schoolName fallback)
 *   - 주변 학교: school.nearbyGroupId 그룹 (없으면 같은 city+district 학교 fallback)
 */
export async function GET(req: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const schoolId = req.nextUrl.searchParams.get('schoolId') || '';
  const grade = req.nextUrl.searchParams.get('grade') || '';
  const examPaperId = req.nextUrl.searchParams.get('examPaperId') || '';

  if (!schoolId && !examPaperId) {
    return NextResponse.json({ data: { nearbyCount: 0, yearCount: 0 } });
  }

  try {
    // 현재 시험의 연도/학기/시험종류 추출 (examScope 우선, title fallback)
    let examYear: string | null = null;
    let examSemester: string | null = null;
    let examExamType: string | null = null;
    let currentSchoolName: string | null = null;

    if (examPaperId) {
      const currentPaper = await prisma.examPaper.findUnique({
        where: { id: examPaperId },
        select: { title: true, examScope: true, schoolName: true },
      });
      if (currentPaper) {
        currentSchoolName = currentPaper.schoolName;
        // 1) examScope JSON 에서 우선 읽기
        const scope = (currentPaper.examScope ?? null) as unknown as
          | { examYear?: number; examSemester?: number; examCategory?: string }
          | null;
        if (scope && typeof scope === 'object' && !Array.isArray(scope)) {
          if (typeof scope.examYear === 'number') examYear = String(scope.examYear);
          if (typeof scope.examSemester === 'number') examSemester = String(scope.examSemester);
          if (typeof scope.examCategory === 'string') {
            // CATEGORY enum → title 표기 정규식 그룹과 매핑
            const map: Record<string, string> = {
              MIDTERM: '중간',
              FINAL: '기말',
              MOCK: '모의',
            };
            examExamType = map[scope.examCategory] ?? null;
          }
        }
        // 2) title fallback
        if (currentPaper.title) {
          if (!examYear) {
            const yearMatch = currentPaper.title.match(/(20\d{2})년?/);
            if (yearMatch) examYear = yearMatch[1];
          }
          if (!examSemester || !examExamType) {
            const semMatch = currentPaper.title.match(/(\d)학기\s*(중간|기말|모의)/);
            if (semMatch) {
              if (!examSemester) examSemester = semMatch[1];
              if (!examExamType) examExamType = semMatch[2];
            }
          }
        }
      }
    }

    const tenantWhere = getTenantFilter(user);

    // 시험지 title 에서 examYear 추출하는 헬퍼 (examScope 우선)
    const extractMeta = (p: { title: string | null; examScope: unknown }) => {
      const scope = p.examScope as
        | { examYear?: number; examSemester?: number; examCategory?: string }
        | null
        | undefined;
      let y: string | null = null;
      let s: string | null = null;
      let t: string | null = null;
      if (scope && typeof scope === 'object' && !Array.isArray(scope)) {
        if (typeof scope.examYear === 'number') y = String(scope.examYear);
        if (typeof scope.examSemester === 'number') s = String(scope.examSemester);
        if (typeof scope.examCategory === 'string') {
          const map: Record<string, string> = { MIDTERM: '중간', FINAL: '기말', MOCK: '모의' };
          t = map[scope.examCategory] ?? null;
        }
      }
      if (p.title) {
        if (!y) {
          const ym = p.title.match(/(20\d{2})년?/);
          if (ym) y = ym[1];
        }
        const sm = p.title.match(/(\d)학기\s*(중간|기말|모의)/);
        if (sm) {
          if (!s) s = sm[1];
          if (!t) t = sm[2];
        }
      }
      return { y, s, t };
    };

    // 1. 연도 비교: 같은 학교(schoolId 또는 schoolName) + 같은 학년 + 같은 학기/시험종류 + 다른 연도
    let yearCount = 0;
    const yearSet = new Set<string>(); // 비교에 포함되는 연도 목록 (hover 표시용)
    {
      const orSchool: Array<Record<string, unknown>> = [];
      if (schoolId) orSchool.push({ schoolId });
      if (currentSchoolName) orSchool.push({ schoolName: currentSchoolName });

      const sameSchoolPapers = orSchool.length
        ? await prisma.examPaper.findMany({
            where: {
              ...tenantWhere,
              OR: orSchool,
              grade: grade || undefined,
              id: examPaperId ? { not: examPaperId } : undefined,
              status: 'COMPLETED',
            },
            select: { title: true, examScope: true },
          })
        : [];

      for (const p of sameSchoolPapers) {
        const meta = extractMeta(p);
        if (examSemester && examExamType && (meta.s !== examSemester || meta.t !== examExamType)) continue;
        if (examYear && meta.y === examYear) continue; // 같은 연도면 제외
        yearCount++;
        if (meta.y) yearSet.add(meta.y);
      }
    }
    // 연도 오름차순 정렬 (hover 표시용)
    const years = [...yearSet].sort();

    // 2. 주변 비교: 같은 그룹 학교(또는 같은 city+district fallback) + 같은 학년 + 같은 연도 + 같은 학기/시험종류
    let nearbyCount = 0;
    let nearbySchools: string[] = []; // 비교에 포함되는 주변 학교명 (hover 표시용)
    if (schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { nearbyGroupId: true, city: true, district: true },
      });

      const idToName = new Map<string, string>();
      let groupSchoolIds: string[] = [];
      if (school?.nearbyGroupId) {
        const groupSchools = await prisma.school.findMany({
          where: { nearbyGroupId: school.nearbyGroupId, id: { not: schoolId } },
          select: { id: true, name: true },
        });
        groupSchoolIds = groupSchools.map(s => s.id);
        groupSchools.forEach(s => idToName.set(s.id, s.name));
      } else if (school?.city && school?.district) {
        // fallback: 같은 시군구의 다른 학교
        const sameAreaSchools = await prisma.school.findMany({
          where: { city: school.city, district: school.district, id: { not: schoolId } },
          select: { id: true, name: true },
        });
        groupSchoolIds = sameAreaSchools.map(s => s.id);
        sameAreaSchools.forEach(s => idToName.set(s.id, s.name));
      }

      if (groupSchoolIds.length > 0) {
        const candidates = await prisma.examPaper.findMany({
          where: {
            ...tenantWhere,
            schoolId: { in: groupSchoolIds },
            grade: grade || undefined,
            status: 'COMPLETED',
          },
          select: { schoolId: true, title: true, examScope: true },
        });

        const matchedSchoolIds = new Set<string>();
        for (const p of candidates) {
          if (!p.schoolId) continue;
          const meta = extractMeta(p);
          if (examYear && meta.y !== examYear) continue;
          if (examSemester && examExamType && (meta.s !== examSemester || meta.t !== examExamType)) continue;
          matchedSchoolIds.add(p.schoolId);
        }
        nearbyCount = matchedSchoolIds.size;
        nearbySchools = [...matchedSchoolIds].map(id => idToName.get(id)).filter((n): n is string => !!n).sort();
      }
    }

    return NextResponse.json({ data: { nearbyCount, yearCount, nearbySchools, years } });
  } catch (error) {
    console.error('[exam-analysis nearby-count GET] 주변 학교 조회 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '주변 학교 비교 데이터를 불러오는 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
