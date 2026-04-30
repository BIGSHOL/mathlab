import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, isResponse, notFound, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { IMPLEMENTED_CATEGORIES } from '@/lib/services/ox-generator';
import type { OxQuizCategory } from '@/lib/services/ox-generator';

const VALID_LEVELS = ['easy', 'medium', 'hard'];

/** GET: 단일 진술 조회 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id } = await params;
  const stmt = await prisma.oxStatement.findUnique({
    where: { id },
    include: {
      concept: { select: { id: true, title: true, conceptCode: true } },
    },
  });
  if (!stmt) return notFound('진술을 찾을 수 없습니다');
  return NextResponse.json({ data: stmt });
}

/** PATCH: 진술 수정 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id } = await params;
  const existing = await prisma.oxStatement.findUnique({ where: { id } });
  if (!existing) return notFound('진술을 찾을 수 없습니다');

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.categoryId !== undefined) {
    if (!IMPLEMENTED_CATEGORIES.has(body.categoryId as OxQuizCategory)) {
      return badRequest('지원하지 않는 카테고리입니다');
    }
    data.categoryId = body.categoryId;
  }
  if (body.level !== undefined) {
    if (!VALID_LEVELS.includes(body.level)) return badRequest('유효하지 않은 난이도입니다');
    data.level = body.level;
  }
  if (body.content !== undefined) {
    if (!body.content || typeof body.content !== 'string') {
      return badRequest('진술 내용이 필요합니다');
    }
    data.content = body.content.trim();
  }
  if (body.answer !== undefined) {
    if (body.answer !== 'O' && body.answer !== 'X') {
      return badRequest('정답은 O 또는 X여야 합니다');
    }
    data.answer = body.answer;
  }
  if (body.explanation !== undefined) {
    data.explanation = body.explanation ? String(body.explanation).trim() : null;
  }
  if (body.source !== undefined) {
    data.source = ['curated', 'algorithm', 'ai'].includes(body.source) ? body.source : 'curated';
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (body.conceptId !== undefined) data.conceptId = body.conceptId || null;
  if (body.tenantId !== undefined) data.tenantId = body.tenantId || null;

  // Phase 3 분류 필드
  if (body.schoolLevel !== undefined) data.schoolLevel = body.schoolLevel || null;
  if (body.grade !== undefined) data.grade = body.grade || null;
  if (body.semester !== undefined) {
    data.semester = typeof body.semester === 'number' ? body.semester : null;
  }
  if (body.part !== undefined) data.part = body.part || null;
  if (body.chapter !== undefined) data.chapter = body.chapter || null;
  if (body.section !== undefined) data.section = body.section || null;
  if (body.sectionSub !== undefined) data.sectionSub = body.sectionSub || null;
  if (body.questionType !== undefined) data.questionType = body.questionType || null;

  const updated = await prisma.oxStatement.update({
    where: { id },
    data,
  });
  return NextResponse.json({ data: updated });
}

/** DELETE: 진술 비활성 처리 (soft delete — 응시 기록 statementId FK 무결성 보존) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id } = await params;
  const existing = await prisma.oxStatement.findUnique({ where: { id } });
  if (!existing) return notFound('진술을 찾을 수 없습니다');

  // soft delete
  await prisma.oxStatement.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ data: { id, deactivated: true } });
}
