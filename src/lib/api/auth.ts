import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { forbidden } from './errors';

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** 선생님/관리자 전용 — 미인증 또는 학생이면 403 */
export async function requireTeacher(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user || user.role === 'STUDENT') return forbidden();
  return user;
}

/** 관리자 전용 — 비관리자면 403 */
export async function requireAdmin(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return forbidden();
  return user;
}

/** 로그인 필수 — 미인증 시 403. role 무관 */
export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return forbidden();
  return user;
}
