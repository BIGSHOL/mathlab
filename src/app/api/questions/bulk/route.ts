import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { bulkCreateQuestionsSchema } from '@/lib/schemas/question';

// POST /api/questions/bulk — 문제 일괄 생성
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '관리자만 사용 가능합니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = bulkCreateQuestionsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join(', ') } },
      { status: 400 }
    );
  }

  const { questions } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.question.createMany({
        data: questions.map((q) => ({
          bookCode: q.bookCode,
          chapter: q.chapter,
          section: q.section || null,
          questionNum: q.questionNum,
          pageNum: q.pageNum || null,
          difficulty: q.difficulty,
          type: q.type,
          content: q.content,
          choices: q.choices || undefined,
          answer: q.answer,
          explanation: q.explanation || null,
          sourceTag: q.sourceTag || null,
          domain: q.domain || null,
          conceptId: q.conceptId || null,
        })),
        skipDuplicates: true,
      });
      return created;
    });

    return NextResponse.json(
      { data: { created: result.count } },
      { status: 201 }
    );
  } catch (err) {
    console.error('문제 일괄 생성 실패:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '문제 생성 중 오류가 발생했습니다' } },
      { status: 500 }
    );
  }
}
