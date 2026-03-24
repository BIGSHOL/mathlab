import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, validateBody } from '@/lib/api';
import { bulkCreateBlanksSchema } from '@/lib/schemas/concept';

// POST /api/concepts/bulk/blanks — 빈칸 문제 일괄 생성
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, bulkCreateBlanksSchema);
  if (isResponse(parsed)) return parsed;

  const { items } = parsed;

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
