import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, validateQuery, validateBody, isResponse } from '@/lib/api';
import { questionQuerySchema, createQuestionSchema } from '@/lib/schemas/question';
import { autoTag } from '@/lib/services/question-tagger';

export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const params = validateQuery(request, questionQuerySchema);
  if (isResponse(params)) return params;

  const { bookCode, chapter, section, difficulty, type, search, page = 1, limit = 20 } = params;

  // bookCodePrefix: 학교급 필터 (E = 초등, 빈 문자열 = 중등)
  const { searchParams } = new URL(request.url);
  const bookCodePrefix = searchParams.get('bookCodePrefix');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (bookCode) {
    where.bookCode = bookCode;
  } else if (bookCodePrefix !== null) {
    if (bookCodePrefix) {
      where.bookCode = { startsWith: bookCodePrefix };
    } else {
      where.bookCode = { not: { startsWith: 'E' } };
    }
  }
  if (chapter) where.chapter = chapter;
  if (section) where.section = section;
  if (difficulty) where.difficulty = difficulty;
  if (type) where.type = type;
  const domain = searchParams.get('domain');
  if (domain) where.domain = domain;
  const hasDomain = searchParams.get('hasDomain');
  if (hasDomain === 'true') where.domain = { not: null };
  else if (hasDomain === 'false') where.domain = null;
  if (search) {
    where.OR = [
      { content: { contains: search } },
      { chapter: { contains: search } },
      { answer: { contains: search } },
    ];
  }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: [{ bookCode: 'asc' }, { chapter: 'asc' }, { questionNum: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  return NextResponse.json({
    data: questions,
    meta: { page, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, createQuestionSchema);
  if (isResponse(parsed)) return parsed;

  // 자동 태깅: domain/conceptId가 없으면 chapter 기반으로 자동 결정
  const data = { ...parsed };
  if (!data.domain || !data.conceptId) {
    const tags = await autoTag({
      chapter: data.chapter,
      section: data.section,
      difficulty: data.difficulty,
      bookCode: data.bookCode,
    });
    if (!data.domain && tags.domain) data.domain = tags.domain;
    if (!data.conceptId && tags.conceptId) data.conceptId = tags.conceptId;
  }

  const question = await prisma.question.create({ data });
  return NextResponse.json({ data: question }, { status: 201 });
}

/** PATCH: 문제 대량 업데이트 (domain, conceptId 태깅) */
export async function PATCH(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { updates } = body as {
    updates: Array<{ id: string; domain?: string | null; conceptId?: string | null }>;
  };

  if (!updates?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'updates 배열이 필요합니다' } },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: { id: string; data: Record<string, any> }[] = [];
  for (const upd of updates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (upd.domain !== undefined) data.domain = upd.domain;
    if (upd.conceptId !== undefined) data.conceptId = upd.conceptId;
    if (Object.keys(data).length > 0) ops.push({ id: upd.id, data });
  }

  if (ops.length > 0) {
    await prisma.$transaction(
      ops.map((op) => prisma.question.update({ where: { id: op.id }, data: op.data }))
    );
  }

  return NextResponse.json({ data: { updated: ops.length } });
}
