import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { badRequest, requireAuth, isResponse } from '@/lib/api';
import { getCurriculumForGrade } from '@/lib/utils/curriculumMapping';

// GET /api/concepts/curriculum-tree?grade=middle_1
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;
  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade');

  if (!grade) {
    return badRequest('grade 파라미터가 필요합니다');
  }

  // 해당 학년의 모든 개념 조회 (학년당 10~40개이므로 페이지네이션 불필요)
  const concepts = await prisma.concept.findMany({
    where: { grade },
    select: {
      id: true,
      title: true,
      conceptCode: true,
      semester: true,
      chapter: true,
      section: true,
      sectionSub: true,
      sortOrder: true,
      part: true,
    },
    orderBy: [{ sortOrder: 'asc' }],
  });

  // 교육과정 계층 구조 가져오기
  const semesterEntries = getCurriculumForGrade(grade);

  // 개념을 semester+chapter+section 슬롯에 매핑
  const usedConceptIds = new Set<string>();

  const semesters = semesterEntries.map((sem) => ({
    key: sem.semesterKey,
    number: sem.semesterNumber,
    chapters: sem.chapters.map((ch) => {
      const sections = (ch.subUnits ?? []).map((sub) => {
        const matched = concepts.filter(
          (c) =>
            c.semester === sem.semesterNumber &&
            c.chapter === ch.name &&
            c.section === sub.name,
        );
        matched.forEach((c) => usedConceptIds.add(c.id));
        return {
          name: sub.name,
          concepts: matched,
        };
      });

      // 대단원에 직접 속하는 개념 (section이 없거나 매칭되지 않은 것)
      const chapterDirect = concepts.filter(
        (c) =>
          c.semester === sem.semesterNumber &&
          c.chapter === ch.name &&
          !usedConceptIds.has(c.id),
      );
      chapterDirect.forEach((c) => usedConceptIds.add(c.id));

      return {
        name: ch.name,
        sections,
        concepts: chapterDirect,
      };
    }),
  }));

  // 미분류 개념 (어떤 슬롯에도 매핑되지 않은 것)
  const unclassified = concepts.filter((c) => !usedConceptIds.has(c.id));

  return NextResponse.json({
    data: { semesters, unclassified },
  });
}
