import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { unauthorized, forbidden } from './errors';
import type { UserRole } from '@/types';

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> & {
  /** SA가 지점장 뷰로 보고 있는 tenantId (null이면 일반 모드) */
  viewingTenantId?: string;
};

// ── 역할 계층 (STUDENT < TEACHER < MANAGER < OWNER < SUPER_ADMIN) ──
const ROLE_LEVEL: Record<string, number> = {
  STUDENT: 0,
  TEACHER: 1,
  MANAGER: 2,
  OWNER: 3,
  SUPER_ADMIN: 4,
};

/** 유저의 역할이 최소 역할 이상인지 확인 */
export function hasRole(user: { role: string }, minRole: UserRole): boolean {
  return (ROLE_LEVEL[user.role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}

/**
 * SA 지점장 뷰 쿠키에서 viewingTenantId 읽어 AuthUser에 주입.
 * SA가 아닌 사용자는 무시.
 */
async function attachViewingTenant(user: AuthUser): Promise<AuthUser> {
  if (user.role !== 'SUPER_ADMIN') return user;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get('viewing_tenant')?.value;
    if (!raw) return user;
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed?.tenantId) {
      return { ...user, viewingTenantId: parsed.tenantId };
    }
  } catch { /* ignore malformed cookie */ }
  return user;
}

/** 선생님 이상 (TEACHER/MANAGER/OWNER/SUPER_ADMIN) */
export async function requireTeacher(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!hasRole(user, 'TEACHER')) return forbidden();
  return attachViewingTenant(user);
}

/** 팀장 이상 (MANAGER/OWNER/SUPER_ADMIN) */
export async function requireManager(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!hasRole(user, 'MANAGER')) return forbidden();
  return attachViewingTenant(user);
}

/** 원장 이상 (OWNER/SUPER_ADMIN) */
export async function requireOwner(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!hasRole(user, 'OWNER')) return forbidden();
  return attachViewingTenant(user);
}

/** 슈퍼관리자 전용 */
export async function requireSuperAdmin(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!hasRole(user, 'SUPER_ADMIN')) return forbidden();
  return attachViewingTenant(user);
}

/** @deprecated requireOwner() 사용 권장 */
export async function requireAdmin(): Promise<AuthUser | NextResponse> {
  return requireOwner();
}

/** 로그인 필수 — 미인증 시 401. role 무관 */
export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return attachViewingTenant(user);
}

/**
 * 로그인 필수 + 학생 시점 보기 지원.
 * 선생님 이상이 `?_as=studentId`로 호출하면 해당 학생 사용자를 반환.
 * 테넌트 검증: 같은 테넌트의 학생만 View-As 허용.
 */
export async function requireAuthViewAs(request: NextRequest): Promise<AuthUser | NextResponse> {
  let user = await getCurrentUser();
  if (!user) return unauthorized();

  // SA 지점장 뷰 쿠키 반영
  user = await attachViewingTenant(user as AuthUser) as typeof user;

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
