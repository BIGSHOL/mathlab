import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { conceptQuerySchema, createConceptSchema } from '@/lib/schemas/concept';

// GET /api/concepts?subjectId=xxx&grade=middle_1&category=concept&part=calc&search=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = conceptQuerySchema.safeParse({
    subjectId: searchParams.get('subjectId') ?? undefined,
    gradeLevel: searchParams.get('gradeLevel') ?? undefined,
    grade: searchParams.get('grade') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    part: searchParams.get('part') ?? undefined,
    semester: searchParams.get('semester') ?? undefined,
    chapter: searchParams.get('chapter') ?? undefined,
    section: searchParams.get('section') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '잘못된 쿼리 파라미터' } },
      { status: 400 }
    );
  }

  const { subjectId, gradeLevel, grade, category, part, semester, chapter, section, search, page, limit } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (subjectId) where.subjectId = subjectId;
  if (gradeLevel) where.subject = { gradeLevel };
  if (grade) where.grade = grade;
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
      orderBy: [{ subject: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
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
    meta: { page, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/concepts
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createConceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값이 올바르지 않습니다',
          details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        },
      },
      { status: 400 }
    );
  }

  const { prerequisites, ...data } = parsed.data;

  const concept = await prisma.concept.create({
    data: {
      ...data,
      ...(prerequisites && prerequisites.length > 0
        ? {
            prerequisites: {
              create: prerequisites.map((prereqId) => ({
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
