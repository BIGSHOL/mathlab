import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CROSS_GRADE_CHAINS } from '@/lib/constants/concepts';

// GET /api/concepts/:id/adjacent — 이전/다음 개념
// mode가 없으면 학생 본인의 conceptNavMode 설정을 따름
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  let mode = searchParams.get('mode'); // curriculum | chain:<체인명>

  // mode가 없으면 학생 프로필에서 읽기
  if (!mode) {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: currentUser.id },
        select: { conceptNavMode: true },
      });
      mode = profile?.conceptNavMode ?? 'curriculum';
    }
  }

  // chain 모드인 경우
  if (mode?.startsWith('chain:')) {
    const chainName = mode.substring(6);
    const chainCodes = CROSS_GRADE_CHAINS[chainName];
    if (!chainCodes) {
      return NextResponse.json({ data: { prev: null, next: null, mode } });
    }

    // 현재 개념의 conceptCode 가져오기
    const current = await prisma.concept.findUnique({
      where: { id },
      select: { conceptCode: true },
    });
    if (!current?.conceptCode) {
      return NextResponse.json({ data: { prev: null, next: null, mode } });
    }

    const idx = chainCodes.indexOf(current.conceptCode);
    if (idx === -1) {
      return NextResponse.json({ data: { prev: null, next: null, mode } });
    }

    // 체인 내 이전/다음 conceptCode로 개념 조회
    const [prev, next] = await Promise.all([
      idx > 0
        ? prisma.concept.findFirst({
            where: { conceptCode: chainCodes[idx - 1] },
            select: { id: true, title: true, conceptCode: true },
          })
        : Promise.resolve(null),
      idx < chainCodes.length - 1
        ? prisma.concept.findFirst({
            where: { conceptCode: chainCodes[idx + 1] },
            select: { id: true, title: true, conceptCode: true },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ data: { prev, next, mode } });
  }

  // curriculum 모드 (기본): 같은 학년 내 sortOrder 기준
  const current = await prisma.concept.findUnique({
    where: { id },
    select: { grade: true, sortOrder: true },
  });

  if (!current || !current.grade) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
      { status: 404 },
    );
  }

  const [prev, next] = await Promise.all([
    prisma.concept.findFirst({
      where: {
        grade: current.grade,
        sortOrder: { lt: current.sortOrder },
      },
      select: { id: true, title: true, conceptCode: true },
      orderBy: { sortOrder: 'desc' },
    }),
    prisma.concept.findFirst({
      where: {
        grade: current.grade,
        sortOrder: { gt: current.sortOrder },
      },
      select: { id: true, title: true, conceptCode: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return NextResponse.json({
    data: { prev, next, mode: 'curriculum' },
  });
}
