import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireTeacher, isResponse, badRequest } from '@/lib/api';
import { CROSS_GRADE_CHAINS } from '@/lib/constants/concepts';

// GET /api/users/:id/concept-nav — 학생의 개념 네비 모드 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { id } = await params;

  // 본인이거나 선생님/관리자만 조회 가능
  if (user.id !== id && user.role === 'STUDENT') {
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
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const body = await request.json();
  const { mode } = body as { mode: string };

  // 유효성 검사: curriculum 또는 chain:<체인명>
  if (mode !== 'curriculum') {
    if (!mode.startsWith('chain:')) {
      return badRequest('mode는 "curriculum" 또는 "chain:<체인명>" 형식이어야 합니다');
    }
    const chainName = mode.substring(6);
    if (!CROSS_GRADE_CHAINS[chainName]) {
      return badRequest(`존재하지 않는 체인: ${chainName}`);
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
