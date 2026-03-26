import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireSuperAdmin, isResponse, notFound, conflict, badRequest } from '@/lib/api';
import { blankQuerySchema } from '@/lib/schemas/concept';

/** 학생의 빈칸 입력 모드 해석: 학생별 > ��별 > 기본값(chip) */
async function resolveInputMode(userId: string): Promise<'chip' | 'typing'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      profile: { select: { blankInputMode: true } },
      classroom: { select: { settings: true } },
    },
  });
  // 학생별 설정 우선
  if (user?.profile?.blankInputMode) return user.profile.blankInputMode as 'chip' | 'typing';
  // 반별 설정
  const classSettings = user?.classroom?.settings as { blankInputMode?: string } | null;
  if (classSettings?.blankInputMode) return classSettings.blankInputMode as 'chip' | 'typing';
  // 기본값
  return 'chip';
}

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
  const user = await requireAuth();
  if (isResponse(user)) return user;

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
    return badRequest('level은 1 또는 2여야 합니다');
  }

  // Find any exercise for this concept (per-blank difficulty replaces per-exercise level)
  const exercise = await prisma.blankExercise.findFirst({
    where: { conceptId: id },
    orderBy: { createdAt: 'desc' },
  });

  if (!exercise) {
    return notFound('빈칸 문제를 찾을 수 없습니다');
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
  // 대응 blank가 없는 {{N}}은 빈 문자열로 치환 (방어 코드)
  const filteredPositions = new Set(filteredBlanks.map((b) => b.position));
  const filteredTemplate = exercise.templateText.replace(/\{\{(\d+)\}\}/g, (match, n) => {
    const pos = parseInt(n, 10);
    if (filteredPositions.has(pos)) return match;
    const blank = allBlanks.find((b) => b.position === pos);
    return blank?.answer ?? '';
  });

  // 학생의 빈칸 입력 모드 해석
  const inputMode = await resolveInputMode(user.id);

  return NextResponse.json({
    data: { ...exercise, templateText: filteredTemplate, blanks: filteredBlanks, inputMode },
  });
}

// POST /api/concepts/:id/blanks — 빈칸 문제 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = await resolveConceptId(rawId) ?? rawId;
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const concept = await prisma.concept.findUnique({ where: { id } });
  if (!concept) {
    return notFound('개념을 찾을 수 없습니다');
  }

  // Check if exercise already exists for this concept
  const existingExercise = await prisma.blankExercise.findFirst({
    where: { conceptId: id },
  });
  if (existingExercise) {
    return conflict('이미 빈칸 문제가 존재합니다. 수정(PUT)을 사용하세요.');
  }

  const body = await request.json();
  const { level, templateText, blanks } = body;

  if (!templateText || !Array.isArray(blanks) || blanks.length === 0) {
    return badRequest('templateText, blanks가 필요합니다');
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
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { exerciseId, level, templateText, blanks } = body;

  if (!exerciseId) {
    return badRequest('exerciseId가 필요합니다');
  }

  const existing = await prisma.blankExercise.findFirst({
    where: { id: exerciseId, conceptId: id },
  });
  if (!existing) {
    return notFound('빈칸 문제를 찾을 수 없습니다');
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
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const exerciseId = searchParams.get('exerciseId');

  if (!exerciseId) {
    return badRequest('exerciseId가 필요합니다');
  }

  const existing = await prisma.blankExercise.findFirst({
    where: { id: exerciseId, conceptId: id },
  });
  if (!existing) {
    return notFound('빈칸 문제를 찾을 수 없습니다');
  }

  await prisma.blankExercise.delete({ where: { id: exerciseId } });
  return NextResponse.json({ data: { id: exerciseId } });
}
