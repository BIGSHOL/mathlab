import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';

/**
 * 지점(Tenant) 관리 — 기출분석 전용 앱용 간소화 버전.
 * 기본 CRUD만 (LMS 라이선스/통계 제거).
 */

// GET — 지점 목록 + 사용자 수
export async function GET() {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, slug: true, name: true, logo: true, isActive: true, createdAt: true,
      _count: { select: { users: true } },
    },
  });
  return NextResponse.json({
    data: tenants.map((t) => ({
      id: t.id, slug: t.slug, name: t.name, logo: t.logo,
      isActive: t.isActive, createdAt: t.createdAt, userCount: t._count.users,
    })),
  });
}

// POST — 지점 생성
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const slug = String(body?.slug ?? '').trim().toLowerCase();
  if (!name || !slug) return badRequest('지점명(name)과 slug는 필수입니다');
  if (!/^[a-z0-9-]+$/.test(slug)) return badRequest('slug는 영소문자/숫자/하이픈만 가능합니다');
  if (await prisma.tenant.findUnique({ where: { slug } })) return badRequest('이미 존재하는 slug입니다');

  const t = await prisma.tenant.create({ data: { name, slug, logo: body?.logo || null } });
  return NextResponse.json({ data: t });
}

// PATCH — 지점 수정 (name / logo / isActive)
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  if (!id) return badRequest('id는 필수입니다');
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.logo === 'string' || body.logo === null) data.logo = body.logo || null;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

  const t = await prisma.tenant.update({ where: { id }, data });
  return NextResponse.json({ data: t });
}
