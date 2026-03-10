import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { bulkCreateConceptSchema } from '@/lib/schemas/concept';

// POST /api/concepts/bulk — 개념 일괄 생성 (Admin 전용)
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '관리자만 사용 가능합니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = bulkCreateConceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값이 올바르지 않습니다',
          details: parsed.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  const { subjectId, concepts } = parsed.data;

  // Verify subject exists
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '과목을 찾을 수 없습니다' } },
      { status: 404 }
    );
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
    return NextResponse.json(
      {
        error: {
          code: 'DUPLICATE_CODE',
          message: '배치 내 중복된 개념 코드가 있습니다',
          details: batchDuplicates,
        },
      },
      { status: 400 }
    );
  }

  // Check for existing conceptCodes in DB
  const allCodes = [...codeSet];
  if (allCodes.length > 0) {
    const existing = await prisma.concept.findMany({
      where: { conceptCode: { in: allCodes } },
      select: { conceptCode: true },
    });
    if (existing.length > 0) {
      const existingSet = new Set(existing.map((e) => e.conceptCode));
      const dbDuplicates = codesInBatch
        .filter((c) => existingSet.has(c.code!))
        .map((c) => ({ row: c.row, conceptCode: c.code! }));
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_CODE',
            message: '이미 존재하는 개념 코드가 있습니다',
            details: dbDuplicates,
          },
        },
        { status: 409 }
      );
    }
  }

  // Create all concepts in a transaction
  const data = concepts.map((c) => ({
    subjectId,
    title: c.title,
    fullContent: c.fullContent,
    conceptCode: c.conceptCode || null,
    grade: c.grade || null,
    category: c.category || null,
    part: c.part || null,
    keywords: c.keywords || null,
  }));

  const result = await prisma.concept.createMany({ data });

  return NextResponse.json(
    { data: { created: result.count, total: concepts.length } },
    { status: 201 }
  );
}
