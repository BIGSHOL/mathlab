import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { unauthorized, forbidden } from './errors';
import type { UserRole } from '@/types';

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// ── 역할 계층 (STUDENT < TEACHER < OWNER < SUPER_ADMIN) ──
const ROLE_LEVEL: Record<string, number> = {
  STUDENT: 0,
  TEACHER: 1,
  OWNER: 3,
  SUPER_ADMIN: 4,
};

/** 유저의 역할이 최소 역할 이상인지 확인 */
export function hasRole(user: { role: string }, minRole: UserRole): boolean {
  return (ROLE_LEVEL[user.role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}

/** 선생님 이상 (TEACHER/OWNER/SUPER_ADMIN) */
export async function requireTeacher(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!hasRole(user, 'TEACHER')) return forbidden();
  return user;
}

/** 원장 이상 (OWNER/SUPER_ADMIN) */
export async function requireOwner(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!hasRole(user, 'OWNER')) return forbidden();
  return user;
}

/** 슈퍼관리자 전용 */
export async function requireSuperAdmin(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!hasRole(user, 'SUPER_ADMIN')) return forbidden();
  return user;
}

/** @deprecated requireOwner() 사용 권장 */
export async function requireAdmin(): Promise<AuthUser | NextResponse> {
  return requireOwner();
}

/** 로그인 필수 — 미인증 시 401. role 무관 */
export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return user;
}

/**
 * 로그인 필수 + 학생 시점 보기 지원.
 * 선생님 이상이 `?_as=studentId`로 호출하면 해당 학생 사용자를 반환.
 * 테넌트 검증: 같은 테넌트의 학생만 View-As 허용.
 */
export async function requireAuthViewAs(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const studentId = new URL(request.url).searchParams.get('_as');
  if (studentId && hasRole(user, 'TEACHER')) {
    // 테넌트 필터: SUPER_ADMIN은 모든 학생 View-As 가능, 나머지는 같은 테넌트만
    const tenantWhere = hasRole(user, 'SUPER_ADMIN') || !user.tenantId
      ? {}
      : { tenantId: user.tenantId };

    const student = await prisma.user.findUnique({
      where: { id: studentId, role: 'STUDENT', deletedAt: null, ...tenantWhere },
      select: { id: true, name: true, username: true, role: true, grade: true, tenantId: true, tenant: { select: { slug: true } } },
    });
    if (student) {
      return {
        id: student.id,
        name: student.name,
        username: student.username,
        role: student.role as AuthUser['role'],
        grade: student.grade,
        tenantId: student.tenantId,
        tenantSlug: student.tenant?.slug ?? null,
      };
    }
  }

  return user;
}
