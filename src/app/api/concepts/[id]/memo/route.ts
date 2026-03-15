import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Resolve concept by conceptCode or cuid id */
async function resolveConceptId(rawId: string): Promise<string | null> {
  const byCode = await prisma.concept.findUnique({ where: { conceptCode: rawId }, select: { id: true } });
  if (byCode) return byCode.id;
  const byId = await prisma.concept.findUnique({ where: { id: rawId }, select: { id: true } });
  return byId?.id ?? null;
}

/** GET: 개념 메모 조회 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const { id: rawId } = await params;
  const conceptId = await resolveConceptId(rawId) ?? rawId;

  const memo = await prisma.conceptMemo.findUnique({
    where: { userId_conceptId: { userId: currentUser.id, conceptId } },
  });

  return NextResponse.json({ data: memo?.content ?? '' });
}

/** PUT: 개념 메모 저장/업데이트 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const { id: rawId } = await params;
  const conceptId = await resolveConceptId(rawId) ?? rawId;
  const body = await request.json();
  const { content } = body;

  if (typeof content !== 'string') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '메모 내용이 필요합니다' } },
      { status: 400 }
    );
  }

  const memo = await prisma.conceptMemo.upsert({
    where: { userId_conceptId: { userId: currentUser.id, conceptId } },
    update: { content },
    create: { userId: currentUser.id, conceptId, content },
  });

  return NextResponse.json({ data: { id: memo.id } });
}
