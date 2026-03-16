import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, isResponse, validateBody, notFound, badRequest, conflict } from '@/lib/api';
import { bulkCreateConceptSchema } from '@/lib/schemas/concept';

// POST /api/concepts/bulk — 개념 일괄 생성 (Admin 전용)
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, bulkCreateConceptSchema);
  if (isResponse(parsed)) return parsed;

  const { subjectId, concepts } = parsed;

  // Verify subject exists
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return notFound('과목을 찾을 수 없습니다');
  }

  // Check for duplicate conceptCodes within the batch
  const codesInBatch = concepts
    .map((c, i) => ({ code: c.conceptCode, row: i }))
    .filter((c) => c.code);
  const codeSet = new Set<string>();
  const batchDuplicates: { row: number; conceptCode: string }[] = [];
  for (const { code, row } of codesInBatch) {
    if (codeSet.has(code!)) {
      batchDuplicates.push({ row, conceptCode: code! });
    }
    codeSet.add(code!);
  }
  if (batchDuplicates.length > 0) {
    return badRequest('배치 내 중복된 개념 코드가 있습니다');
  }

  // Check for existing conceptCodes in DB
  const allCodes = [...codeSet];
  if (allCodes.length > 0) {
    const existing = await prisma.concept.findMany({
      where: { conceptCode: { in: allCodes } },
      select: { conceptCode: true },
    });
    if (existing.length > 0) {
      return conflict('이미 존재하는 개념 코드가 있습니다');
    }
  }

  // Create all concepts in a transaction (individual creates to get IDs)
  const data = concepts.map((c) => ({
    subjectId,
    title: c.title,
    fullContent: c.fullContent,
    conceptCode: c.conceptCode || null,
    grade: c.grade || null,
    semester: c.semester ?? null,
    chapter: c.chapter || null,
    section: c.section || null,
    sectionSub: c.sectionSub || null,
    category: c.category || null,
    part: c.part || null,
    source: c.source || null,
    keywords: c.keywords || null,
  }));

  const created = await prisma.$transaction(
    data.map((d) => prisma.concept.create({ data: d, select: { id: true } }))
  );

  return NextResponse.json(
    { data: { created: created.length, total: concepts.length, conceptIds: created.map((c) => c.id) } },
    { status: 201 }
  );
}
