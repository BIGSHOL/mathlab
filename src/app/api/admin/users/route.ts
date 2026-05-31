import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';

/**
 * 사용자(User) 관리 — 기출분석 전용 앱용 간소화 버전.
 * 기본 CRUD만 (학생 활동 통계 제거). 운영 계정(TEACHER/MANAGER/OWNER/SUPER_ADMIN) 관리용.
 */
const ROLES = ['STUDENT', 'TEACHER', 'MANAGER', 'OWNER', 'SUPER_ADMIN'];

// GET — 사용자 목록 (tenantId / role / q 필터)
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const where: Record<string, unknown> = { deletedAt: null };
  const tenantId = searchParams.get('tenantId');
  const role = searchParams.get('role');
  const q = searchParams.get('q')?.trim();
  if (tenantId) where.tenantId = tenantId;
  if (role && ROLES.includes(role)) where.role = role;
  if (q) where.OR = [
    { username: { contains: q, mode: 'insensitive' } },
    { name: { contains: q, mode: 'insensitive' } },
  ];

  const users = await prisma.user.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 500,
    select: {
      id: true, username: true, name: true, role: true, tenantId: true,
      email: true, createdAt: true, tenant: { select: { name: true, slug: true } },
    },
  });
  return NextResponse.json({ data: users });
}

// POST — 계정 생성
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username ?? '').trim();
  const name = String(body?.name ?? '').trim();
  const password = String(body?.password ?? '');
  const role = String(body?.role ?? 'TEACHER');
  const tenantId = body?.tenantId || null;
  if (!username || !name || !password) return badRequest('username, name, password는 필수입니다');
  if (!ROLES.includes(role)) return badRequest('역할(role) 값이 올바르지 않습니다');
  if (await prisma.user.findUnique({ where: { username } })) return badRequest('이미 존재하는 username입니다');

  const passwordHash = await bcrypt.hash(password, 10);
  const u = await prisma.user.create({ data: { username, name, passwordHash, role: role as never, tenantId } });
  return NextResponse.json({ data: { id: u.id, username: u.username } });
}

// PATCH — 계정 수정 (name / role / tenantId / 비밀번호 재설정)
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  if (!id) return badRequest('id는 필수입니다');
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.role === 'string' && ROLES.includes(body.role)) data.role = body.role;
  if (body.tenantId !== undefined) data.tenantId = body.tenantId || null;
  if (body.password) data.passwordHash = await bcrypt.hash(String(body.password), 10);

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ data: { ok: true } });
}

// DELETE — 소프트 삭제 (?id=)
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return badRequest('id는 필수입니다');
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ data: { ok: true } });
}
