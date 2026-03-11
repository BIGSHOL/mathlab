import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CROSS_GRADE_CHAINS } from '@/lib/constants/concepts';

// GET /api/users/:id/concept-nav — 학생의 개념 네비 모드 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 },
    );
  }

  const { id } = await params;

  // 본인이거나 선생님/관리자만 조회 가능
  if (currentUser.id !== id && currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 },
    );
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: id },
    select: { conceptNavMode: true },
  });

  const chains = Object.keys(CROSS_GRADE_CHAINS);

  return NextResponse.json({
    data: {
      mode: profile?.conceptNavMode ?? 'curriculum',
      availableChains: chains,
    },
  });
}

// PATCH /api/users/:id/concept-nav — 학생의 개념 네비 모드 설정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '선생님만 설정할 수 있습니다' } },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = await request.json();
  const { mode } = body as { mode: string };

  // 유효성 검사: curriculum 또는 chain:<체인명>
  if (mode !== 'curriculum') {
    if (!mode.startsWith('chain:')) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'mode는 "curriculum" 또는 "chain:<체인명>" 형식이어야 합니다' } },
        { status: 400 },
      );
    }
    const chainName = mode.substring(6);
    if (!CROSS_GRADE_CHAINS[chainName]) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `존재하지 않는 체인: ${chainName}` } },
        { status: 400 },
      );
    }
  }

  // upsert: 프로필이 없으면 생성
  const profile = await prisma.studentProfile.upsert({
    where: { userId: id },
    update: { conceptNavMode: mode },
    create: { userId: id, conceptNavMode: mode },
    select: { conceptNavMode: true },
  });

  return NextResponse.json({
    data: { mode: profile.conceptNavMode },
  });
}
