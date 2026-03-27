import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, requireOwner, isResponse, badRequest } from '@/lib/api';

/** GET /api/exam-analysis/question-references — 참조 문제 목록 (TEACHER+) */
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject') as 'MATH' | 'ENGLISH' | null;
  const grade = searchParams.get('grade');
  const difficulty = searchParams.get('difficulty');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const where: Record<string, unknown> = {
    ...(subject && { subject }),
    ...(grade && { grade }),
    ...(difficulty && { difficulty }),
  };

  const [items, total] = await Promise.all([
    prisma.examQuestionReference.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.examQuestionReference.count({ where }),
  ]);

  return NextResponse.json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/** POST /api/exam-analysis/question-references — 참조 문제 추가 (OWNER+) */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { subject, grade, difficulty, questionType, content, answer, source } = body;

  if (!subject || !grade || !difficulty || !questionType || !content) {
    return badRequest('필수 항목을 입력하세요');
  }

  const ref = await prisma.examQuestionReference.create({
    data: {
      subject,
      grade,
      difficulty,
      questionType,
      content,
      answer: answer || null,
      source: source || null,
    },
  });

  return NextResponse.json({ data: ref }, { status: 201 });
}
