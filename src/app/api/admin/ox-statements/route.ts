import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { IMPLEMENTED_CATEGORIES } from '@/lib/services/ox-generator';
import type { OxQuizCategory } from '@/lib/services/ox-generator';

const VALID_LEVELS = ['easy', 'medium', 'hard'];

/** GET: 진술 목록 조회 (필터 + 정렬) */
export async function GET(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const grade = url.searchParams.get('grade');
  const semester = url.searchParams.get('semester');
  const chapter = url.searchParams.get('chapter');
  const section = url.searchParams.get('section');
  const questionType = url.searchParams.get('questionType');
  const level = url.searchParams.get('level');
  const isActive = url.searchParams.get('isActive');
  const search = url.searchParams.get('search')?.trim();

  const where: Record<string, unknown> = {};
  if (category) where.categoryId = category;
  if (grade) where.grade = grade;
  if (semester) where.semester = Number(semester);
  if (chapter) where.chapter = chapter;
  if (section) where.section = section;
  if (questionType) where.questionType = questionType;
  if (level) where.level = level;
  if (isActive === 'true') where.isActive = true;
  else if (isActive === 'false') where.isActive = false;
  if (search) where.content = { contains: search, mode: 'insensitive' };

  const statements = await prisma.oxStatement.findMany({
    where,
    orderBy: [
      { grade: 'asc' },
      { semester: 'asc' },
      { chapter: 'asc' },
      { questionType: 'asc' },
      { level: 'asc' },
      { id: 'asc' },
    ],
  });

  // 다차원 분포: 학년×대단원×유형×난이도×활성
  const stats = await prisma.oxStatement.groupBy({
    by: ['grade', 'chapter', 'questionType', 'level', 'isActive'],
    _count: { _all: true },
  });

  // legacy: 카테고리×난이도×활성 (현재 admin 카드용)
  const legacyStats = await prisma.oxStatement.groupBy({
    by: ['categoryId', 'level', 'isActive'],
    _count: { _all: true },
  });

  return NextResponse.json({ data: { statements, stats, legacyStats } });
}

/** POST: 진술 신규 추가 */
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const {
    id,
    categoryId,
    level,
    content,
    answer,
    explanation,
    source,
    conceptId,
    tenantId,
    isActive,
    schoolLevel,
    grade,
    semester,
    part,
    chapter,
    section,
    sectionSub,
    questionType,
  } = body;

  if (!IMPLEMENTED_CATEGORIES.has(categoryId as OxQuizCategory)) {
    return badRequest('지원하지 않는 카테고리입니다');
  }
  if (!VALID_LEVELS.includes(level)) return badRequest('유효하지 않은 난이도입니다');
  if (!content || typeof content !== 'string') return badRequest('진술 내용이 필요합니다');
  if (answer !== 'O' && answer !== 'X') return badRequest('정답은 O 또는 X여야 합니다');

  const data: Record<string, unknown> = {
    categoryId,
    level,
    content: content.trim(),
    answer,
    explanation: explanation ? String(explanation).trim() : null,
    source: ['curated', 'algorithm', 'ai'].includes(source) ? source : 'curated',
    isActive: isActive !== false,
    tenantId: tenantId || null,
    conceptId: conceptId || null,
    createdBy: user.id,
    schoolLevel: schoolLevel ?? null,
    grade: grade ?? null,
    semester: typeof semester === 'number' ? semester : null,
    part: part ?? null,
    chapter: chapter ?? null,
    section: section ?? null,
    sectionSub: sectionSub ?? null,
    questionType: questionType ?? null,
  };
  if (id && typeof id === 'string') data.id = id;

  try {
    const created = await prisma.oxStatement.create({ data: data as Parameters<typeof prisma.oxStatement.create>[0]['data'] });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      return badRequest('이미 존재하는 ID입니다');
    }
    throw err;
  }
}
