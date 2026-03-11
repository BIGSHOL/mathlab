import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { blankQuerySchema } from '@/lib/schemas/concept';

/** Resolve concept by conceptCode or cuid id */
async function resolveConceptId(id: string): Promise<string | null> {
  const byCode = await prisma.concept.findUnique({ where: { conceptCode: id }, select: { id: true } });
  if (byCode) return byCode.id;
  const byId = await prisma.concept.findUnique({ where: { id }, select: { id: true } });
  return byId?.id ?? null;
}

// GET /api/concepts/:id/blanks?level=1  (student: single exercise)
// GET /api/concepts/:id/blanks?all=true  (teacher: all exercises)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = await resolveConceptId(rawId) ?? rawId;
  const { searchParams } = new URL(request.url);

  // Teacher/Admin: return all blank exercises for this concept
  if (searchParams.get('all') === 'true') {
    const exercises = await prisma.blankExercise.findMany({
      where: { conceptId: id },
      orderBy: { level: 'asc' },
    });
    return NextResponse.json({ data: exercises });
  }

  // Student: return exercise with blanks filtered by difficulty
  const parsed = blankQuerySchema.safeParse({
    level: searchParams.get('level') ?? '1',
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'level은 1 또는 2여야 합니다' } },
      { status: 400 }
    );
  }

  // Find any exercise for this concept (per-blank difficulty replaces per-exercise level)
  const exercise = await prisma.blankExercise.findFirst({
    where: { conceptId: id },
    orderBy: { createdAt: 'desc' },
  });

  if (!exercise) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '빈칸 문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // Filter blanks by difficulty based on requested level
  // Level 1 (1단계): easy blanks only
  // Level 2 (2단계): easy + hard blanks
  // Level 3 (통문장): all blanks (easy + hard + full)
  const level = parsed.data.level;
  const allBlanks = exercise.blanks as Array<{ position: number; answer: string; hint: string; difficulty?: string }>;
  const filteredBlanks = allBlanks.filter((b) => {
    const diff = b.difficulty || 'easy';
    if (level === 1) return diff === 'easy' || diff === 'both';
    if (level === 2) return diff === 'easy' || diff === 'hard' || diff === 'both';
    return true; // level 3: show all
  });

  // Rebuild template: only keep {{N}} markers for filtered blanks
  const filteredPositions = new Set(filteredBlanks.map((b) => b.position));
  const filteredTemplate = exercise.templateText.replace(/\{\{(\d+)\}\}/g, (match, n) => {
    return filteredPositions.has(parseInt(n, 10)) ? match : (() => {
      const blank = allBlanks.find((b) => b.position === parseInt(n, 10));
      return blank?.answer ?? match;
    })();
  });

  return NextResponse.json({
    data: { ...exercise, templateText: filteredTemplate, blanks: filteredBlanks },
  });
}

// POST /api/concepts/:id/blanks — 빈칸 문제 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = await resolveConceptId(rawId) ?? rawId;
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const concept = await prisma.concept.findUnique({ where: { id } });
  if (!concept) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // Check if exercise already exists for this concept
  const existingExercise = await prisma.blankExercise.findFirst({
    where: { conceptId: id },
  });
  if (existingExercise) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: '이미 빈칸 문제가 존재합니다. 수정(PUT)을 사용하세요.' } },
      { status: 409 }
    );
  }

  const body = await request.json();
  const { level, templateText, blanks } = body;

  if (!templateText || !Array.isArray(blanks) || blanks.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'templateText, blanks가 필요합니다' } },
      { status: 400 }
    );
  }

  const exercise = await prisma.blankExercise.create({
    data: { conceptId: id, level: level || 1, templateText, blanks },
  });

  return NextResponse.json({ data: exercise }, { status: 201 });
}

// PUT /api/concepts/:id/blanks — 빈칸 문제 수정 (body.exerciseId로 식별)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = await resolveConceptId(rawId) ?? rawId;
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { exerciseId, level, templateText, blanks } = body;

  if (!exerciseId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'exerciseId가 필요합니다' } },
      { status: 400 }
    );
  }

  const existing = await prisma.blankExercise.findFirst({
    where: { id: exerciseId, conceptId: id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '빈칸 문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const updated = await prisma.blankExercise.update({
    where: { id: exerciseId },
    data: {
      ...(level !== undefined && { level }),
      ...(templateText !== undefined && { templateText }),
      ...(blanks !== undefined && { blanks }),
    },
  });

  return NextResponse.json({ data: updated });
}

// DELETE /api/concepts/:id/blanks — 빈칸 문제 삭제 (body.exerciseId)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = await resolveConceptId(rawId) ?? rawId;
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const exerciseId = searchParams.get('exerciseId');

  if (!exerciseId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'exerciseId가 필요합니다' } },
      { status: 400 }
    );
  }

  const existing = await prisma.blankExercise.findFirst({
    where: { id: exerciseId, conceptId: id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '빈칸 문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  await prisma.blankExercise.delete({ where: { id: exerciseId } });
  return NextResponse.json({ data: { id: exerciseId } });
}
