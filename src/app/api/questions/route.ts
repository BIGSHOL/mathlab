import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { questionQuerySchema, createQuestionSchema } from '@/lib/schemas/question';

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = questionQuerySchema.safeParse({
    bookCode: searchParams.get('bookCode') ?? undefined,
    chapter: searchParams.get('chapter') ?? undefined,
    difficulty: searchParams.get('difficulty') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '잘못된 쿼리 파라미터' } },
      { status: 400 }
    );
  }

  const { bookCode, chapter, difficulty, type, search, page, limit } = parsed.data;

  // bookCodePrefix: 학교급 필터 (E = 초등, 빈 문자열 = 중등)
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
  if (difficulty) where.difficulty = difficulty;
  if (type) where.type = type;
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
      select: {
        id: true,
        bookCode: true,
        chapter: true,
        section: true,
        questionNum: true,
        difficulty: true,
        type: true,
        content: true,
        choices: true,
        answer: true,
        explanation: true,
        sourceTag: true,
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
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값이 올바르지 않습니다',
          details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        },
      },
      { status: 400 }
    );
  }

  const question = await prisma.question.create({ data: parsed.data });
  return NextResponse.json({ data: question }, { status: 201 });
}
