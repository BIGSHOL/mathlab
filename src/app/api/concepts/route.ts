import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, validateQuery, validateBody, isResponse } from '@/lib/api';
import { conceptQuerySchema, createConceptSchema } from '@/lib/schemas/concept';

// GET /api/concepts?subjectId=xxx&grade=middle_1&category=concept&part=calc&search=xxx
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const params = validateQuery(request, conceptQuerySchema);
  if (isResponse(params)) return params;

  const { subjectId, gradeLevel, grade, category, part, semester, chapter, section, search, page = 1, limit = 20 } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
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
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, createConceptSchema);
  if (isResponse(parsed)) return parsed;

  const { prerequisites, ...data } = parsed;

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
