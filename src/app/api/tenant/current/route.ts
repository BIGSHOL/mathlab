import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

/**
 * GET /api/tenant/current
 * 현재 서브도메인의 테넌트 정보 반환 (인증 불필요, 로그인 페이지용).
 * 미들웨어가 주입한 x-tenant-slug 헤더 사용.
 */
export async function GET() {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug');

  if (!slug) {
    return NextResponse.json({ data: null }); // 메인 도메인
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug, isActive: true },
    select: { id: true, slug: true, name: true, logo: true },
  });

  if (!tenant) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '존재하지 않는 지점입니다' } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: tenant });
}
