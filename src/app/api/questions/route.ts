import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, requireSuperAdmin, validateQuery, validateBody, isResponse } from '@/lib/api';
import { questionQuerySchema, createQuestionSchema } from '@/lib/schemas/question';
import { autoTag } from '@/lib/services/question-tagger';

export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const params = validateQuery(request, questionQuerySchema);
  if (isResponse(params)) return params;

  const { bookCode, chapter, section, difficulty, type, search, page = 1, limit = 20 } = params;
  // 드래프트/변형은 기본 제외 (명시적으로 옵션 플래그가 있을 때만 포함)
  const _searchParams = new URL(request.url).searchParams;
  const includeDrafts = _searchParams.get('includeDrafts') === 'true';
  const includeVariants = _searchParams.get('includeVariants') === 'true';

  // bookCodePrefix: 학교급 필터 (E = 초등, 빈 문자열 = 중등)
  const { searchParams } = new URL(request.url);
  const bookCodePrefix = searchParams.get('bookCodePrefix');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (!includeDrafts) where.isDraft = false;
  if (!includeVariants) where.variantOfId = null;
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

  // sourceTag 필터 (AI 생성 문제 등)
  const sourceTag = searchParams.get('sourceTag');
  if (sourceTag) where.sourceTag = sourceTag;

  // AND 조건 누적용 배열
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andConditions: Record<string, any>[] = [];

  // tenant 스코핑: SUPER_ADMIN은 전체 + tenantId 필터 가능, 나머지는 자기 지점 + 공용(null)
  const filterTenantId = searchParams.get('tenantId');
  if (user.role === 'SUPER_ADMIN') {
    if (filterTenantId) where.tenantId = filterTenantId;
  } else {
    // 자기 지점 문제 + 공용 문제(tenantId=null)만 조회
    andConditions.push({ OR: [{ tenantId: user.viewingTenantId ?? user.tenantId }, { tenantId: null }] });
  }

  if (search) {
    // 공백 구분 다중 토큰 AND 검색. "..."로 구문 묶기 지원. 각 토큰은 필드 OR, 토큰 간 AND.
    const tokens: string[] = [];
    const tokenRe = /"([^"]+)"|(\S+)/g;
    let tm: RegExpExecArray | null;
    while ((tm = tokenRe.exec(search)) !== null) {
      const t = (tm[1] ?? tm[2] ?? '').trim();
      if (t) tokens.push(t);
    }
    for (const tok of tokens) {
      const numMatch = tok.match(/^#?(\d+)$/);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orConds: Record<string, any>[] = [
        { content: { contains: tok } },
        { chapter: { contains: tok } },
        { section: { contains: tok } },
        { answer: { contains: tok } },
        { source: { contains: tok } },
        { sourceTag: { contains: tok } },
        { bookCode: { contains: tok } },
        { explanation: { contains: tok } },
      ];
      if (numMatch) orConds.push({ questionNum: Number(numMatch[1]) });
      andConditions.push({ OR: orConds });
    }
  }

  // 해설 유무 필터
  const noExplanation = searchParams.get('noExplanation');
  if (noExplanation === 'true') {
    andConditions.push({ OR: [{ explanation: null }, { explanation: '' }] });
  }

  // 그림 없는 문제만
  const noDiagram = searchParams.get('noDiagram');
  if (noDiagram === 'true') {
    andConditions.push({ diagramSpec: { equals: null } });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { variants: true } },
      },
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
  const user = await requireSuperAdmin();
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

/** PATCH: 문제 대량 업데이트 (domain, conceptId 태깅) — SUPER_ADMIN 전용 */
export async function PATCH(request: NextRequest) {
  const user = await requireSuperAdmin();
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
