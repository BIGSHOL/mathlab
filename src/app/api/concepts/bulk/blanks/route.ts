import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { bulkCreateBlanksSchema } from '@/lib/schemas/concept';

// POST /api/concepts/bulk/blanks — 빈칸 문제 일괄 생성
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '관리자만 사용 가능합니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = bulkCreateBlanksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값이 올바르지 않습니다',
          details: parsed.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  const { items } = parsed.data;

  // Flatten all exercises for batch creation
  const createOps = items.flatMap((item) =>
    item.exercises.map((ex) =>
      prisma.blankExercise.create({
        data: {
          conceptId: item.conceptId,
          level: ex.level,
          templateText: ex.templateText,
          blanks: ex.blanks,
        },
      })
    )
  );

  const results = await prisma.$transaction(createOps);

  return NextResponse.json(
    { data: { created: results.length } },
    { status: 201 }
  );
}
