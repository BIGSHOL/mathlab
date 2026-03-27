import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, requireOwner, isResponse, badRequest } from '@/lib/api';

/** GET /api/exam-analysis/patterns — 오답 패턴 목록 조회 (TEACHER+) */
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject') as 'MATH' | 'ENGLISH' | null;
  const search = searchParams.get('search');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));

  const where: Record<string, unknown> = {
    isActive: true,
    ...(subject && { subject }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.examErrorPattern.findMany({
      where,
      include: {
        problemType: {
          select: {
            id: true,
            name: true,
            category: {
              select: { id: true, name: true, subject: true },
            },
          },
        },
      },
      orderBy: [{ severity: 'desc' }, { frequency: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.examErrorPattern.count({ where }),
  ]);

  return NextResponse.json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/** POST /api/exam-analysis/patterns — 오답 패턴 생성 (OWNER+) */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const body = await request.json();
  const {
    name,
    description,
    subject,
    problemTypeId,
    errorType,
    severity,
    wrongExamples,
    correctExamples,
    feedbackMessage,
    detectionKeywords,
  } = body;

  if (!name || !description || !subject || !errorType) {
    return badRequest('필수 항목을 입력하세요 (name, description, subject, errorType)');
  }

  if (!['MATH', 'ENGLISH'].includes(subject)) {
    return badRequest('subject는 MATH 또는 ENGLISH만 허용됩니다');
  }

  if (severity !== undefined && (typeof severity !== 'number' || severity < 1 || severity > 5)) {
    return badRequest('severity는 1~5 사이 숫자여야 합니다');
  }

  // problemTypeId 유효성 검증
  if (problemTypeId) {
    const problemType = await prisma.examProblemType.findUnique({
      where: { id: problemTypeId },
    });
    if (!problemType) return badRequest('존재하지 않는 문제 유형입니다');
  }

  const pattern = await prisma.examErrorPattern.create({
    data: {
      name,
      description,
      subject,
      problemTypeId: problemTypeId || null,
      errorType,
      severity: severity ?? 1,
      wrongExamples: wrongExamples ?? undefined,
      correctExamples: correctExamples ?? undefined,
      feedbackMessage: feedbackMessage ?? null,
      detectionKeywords: detectionKeywords ?? undefined,
    },
    include: {
      problemType: {
        select: {
          id: true,
          name: true,
          category: {
            select: { id: true, name: true, subject: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ data: pattern }, { status: 201 });
}
