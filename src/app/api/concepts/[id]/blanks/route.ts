import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { blankQuerySchema } from '@/lib/schemas/concept';

// GET /api/concepts/:id/blanks?level=1
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const parsed = blankQuerySchema.safeParse({
    level: searchParams.get('level') ?? '1',
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'level은 1 또는 2여야 합니다' } },
      { status: 400 }
    );
  }

  const exercise = await prisma.blankExercise.findFirst({
    where: { conceptId: id, level: parsed.data.level },
  });

  if (!exercise) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '빈칸 문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: exercise });
}
