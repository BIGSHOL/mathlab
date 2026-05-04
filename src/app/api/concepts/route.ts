import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, requireSuperAdmin, validateQuery, validateBody, isResponse, normalizeConceptContent } from '@/lib/api';
import { conceptQuerySchema, createConceptSchema } from '@/lib/schemas/concept';
import { detectDuplicates } from '@/lib/concept-dedupe';

// GET /api/concepts?subjectId=xxx&grade=middle_1&category=concept&part=calc&search=xxx
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const params = validateQuery(request, conceptQuerySchema);
  if (isResponse(params)) return params;

  const { subjectId, gradeLevel, grade, category, part, semester, chapter, section, search, page = 1, limit = 20 } = params;
  // ?source=textbook-rich 로 호출하면 워크북 전용 본문만 조회 (워크북 모달용)
  // 기본은 일반 개념만 (textbook-rich 제외) — 선생도 일반 개념 관리에서는 안 보이게
  const sourceFilter = new URL(request.url).searchParams.get('source');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = sourceFilter === 'textbook-rich'
    ? { source: 'textbook-rich' }
    : { NOT: { source: 'textbook-rich' } };
  if (subjectId) where.subjectId = subjectId;
  if (gradeLevel) where.subject = { gradeLevel };
  if (grade) {
    const grades = grade.split(',').filter(Boolean);
    where.grade = grades.length === 1 ? grades[0] : { in: grades };
  }
  if (category) where.category = category;
  if (part) where.part = part;
  if (semester) where.semester = semester;
  if (chapter) where.chapter = chapter;
  if (section) where.section = section;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { fullContent: { contains: search } },
      { conceptCode: { contains: search } },
      { keywords: { contains: search } },
    ];
  }

  const [concepts, total] = await Promise.all([
    prisma.concept.findMany({
      where,
      select: {
        id: true,
        subjectId: true,
        title: true,
        fullContent: true,
        conceptCode: true,
        grade: true,
        semester: true,
        chapter: true,
        section: true,
        sectionSub: true,
        category: true,
        part: true,
        keywords: true,
        sortOrder: true,
        subject: { select: { title: true, gradeLevel: true } },
        prerequisites: {
          select: {
            prerequisite: { select: { id: true, conceptCode: true, title: true } },
          },
        },
        prerequisiteFor: {
          select: {
            concept: { select: { id: true, conceptCode: true, title: true } },
          },
        },
      },
      orderBy: [{ subject: { sortOrder: 'asc' } }, { conceptCode: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.concept.count({ where }),
  ]);

  const data = concepts.map((c) => ({
    ...c,
    prerequisites: c.prerequisites.map((p) => p.prerequisite),
    subConcepts: c.prerequisiteFor.map((p) => p.concept),
  }));

  return NextResponse.json({
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/concepts — SUPER_ADMIN 전용 (공용 컨텐츠 생성)
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, createConceptSchema);
  if (isResponse(parsed)) return parsed;

  const { prerequisites, force, ...data } = parsed;

  // 중복 검사 (Layer A 확정 / Layer B 유력)
  const [conflict] = await detectDuplicates([
    { title: data.title, grade: data.grade, chapter: data.chapter, section: data.section },
  ]);
  if (conflict) {
    if (conflict.layer === 'A') {
      return NextResponse.json(
        {
          error: {
            code: 'CONCEPT_EXACT_DUPLICATE',
            message: `동일한 개념이 이미 존재합니다 (${conflict.existing.chapter || '-'} / ${conflict.existing.section || '-'} / ${conflict.existing.title})`,
            details: conflict,
          },
        },
        { status: 409 }
      );
    }
    if (conflict.layer === 'B' && !force) {
      return NextResponse.json(
        {
          error: {
            code: 'CONCEPT_LIKELY_DUPLICATE',
            message: `같은 단원에 동일한 제목의 개념이 있습니다 (${conflict.existing.section || '-'} / ${conflict.existing.title}). 의도적으로 구분하려면 force=true로 다시 요청하세요.`,
            details: conflict,
          },
        },
        { status: 409 }
      );
    }
  }

  // 개념 내용 정규화 (blockquote 제거 + 번호 → 동그라미 숫자)
  if (data.fullContent) {
    data.fullContent = normalizeConceptContent(data.fullContent);
  }

  const concept = await prisma.concept.create({
    data: {
      ...data,
      ...(prerequisites && prerequisites.length > 0
        ? {
            prerequisites: {
              create: prerequisites.map((prereqId: string) => ({
                prerequisite: { connect: { id: prereqId } },
              })),
            },
          }
        : {}),
    },
    include: {
      subject: { select: { title: true, gradeLevel: true } },
    },
  });

  return NextResponse.json({ data: concept }, { status: 201 });
}
