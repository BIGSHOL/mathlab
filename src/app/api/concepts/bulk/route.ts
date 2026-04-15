import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, validateBody, notFound, badRequest, conflict } from '@/lib/api';
import { bulkCreateConceptSchema } from '@/lib/schemas/concept';
import { detectDuplicates, detectBatchInternalDuplicates } from '@/lib/concept-dedupe';

// POST /api/concepts/bulk — 개념 일괄 생성 (Admin 전용)
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, bulkCreateConceptSchema);
  if (isResponse(parsed)) return parsed;

  const { subjectId, concepts, force } = parsed;

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

  // 배치 내부 (title, grade, chapter, section) 중복 — Layer A는 항상 차단, B는 force로 완화
  const internalDupes = detectBatchInternalDuplicates(
    concepts.map((c) => ({ title: c.title, grade: c.grade, chapter: c.chapter, section: c.section }))
  );
  const internalA = internalDupes.filter((d) => d.layer === 'A');
  const internalB = internalDupes.filter((d) => d.layer === 'B');
  if (internalA.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: 'CONCEPT_BATCH_EXACT_DUPLICATE',
          message: `배치 내에 동일 좌표+제목 개념이 중복되었습니다 (${internalA.length}건)`,
          details: internalA,
        },
      },
      { status: 400 }
    );
  }
  if (internalB.length > 0 && !force) {
    return NextResponse.json(
      {
        error: {
          code: 'CONCEPT_BATCH_LIKELY_DUPLICATE',
          message: `배치 내에 같은 단원+동일 제목 개념이 여러 건입니다 (${internalB.length}건). force=true 로 재요청하세요.`,
          details: internalB,
        },
      },
      { status: 409 }
    );
  }

  // DB 기존값과의 중복 검사
  const dbConflicts = await detectDuplicates(
    concepts.map((c) => ({ title: c.title, grade: c.grade, chapter: c.chapter, section: c.section }))
  );
  const dbA: Array<{ row: number; title: string; existing: unknown }> = [];
  const dbB: Array<{ row: number; title: string; existing: unknown }> = [];
  dbConflicts.forEach((conf, i) => {
    if (!conf) return;
    if (conf.layer === 'A') dbA.push({ row: i, title: concepts[i].title, existing: conf.existing });
    else if (conf.layer === 'B') dbB.push({ row: i, title: concepts[i].title, existing: conf.existing });
  });
  if (dbA.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: 'CONCEPT_EXACT_DUPLICATE',
          message: `DB에 동일 좌표+제목 개념이 이미 존재합니다 (${dbA.length}건, force로 우회 불가)`,
          details: dbA,
        },
      },
      { status: 409 }
    );
  }
  if (dbB.length > 0 && !force) {
    return NextResponse.json(
      {
        error: {
          code: 'CONCEPT_LIKELY_DUPLICATE',
          message: `같은 단원에 동일 제목 개념이 이미 존재합니다 (${dbB.length}건). force=true 로 재요청하세요.`,
          details: dbB,
        },
      },
      { status: 409 }
    );
  }

  // 기존 최대 sortOrder 조회 (순서 이어 붙이기)
  const maxSort = await prisma.concept.aggregate({
    where: { subjectId },
    _max: { sortOrder: true },
  });
  const baseSort = (maxSort._max.sortOrder ?? -1) + 1;

  // Create all concepts in a transaction (individual creates to get IDs)
  const data = concepts.map((c, i) => ({
    subjectId,
    title: c.title,
    fullContent: c.fullContent,
    sortOrder: c.sortOrder ?? baseSort + i,
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
