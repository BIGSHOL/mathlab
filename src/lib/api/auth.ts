import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

/**
 * 로그인 필수 + 학생 시점 보기 지원.
 * 선생님/관리자가 `?_as=studentId`로 호출하면 해당 학생 사용자를 반환.
 */
export async function requireAuthViewAs(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return forbidden();

  const studentId = new URL(request.url).searchParams.get('_as');
  if (studentId && (user.role === 'TEACHER' || user.role === 'ADMIN')) {
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: 'STUDENT', deletedAt: null },
      select: { id: true, name: true, username: true, role: true, grade: true },
    });
    if (student) {
      return {
        id: student.id,
        name: student.name,
        username: student.username,
        role: student.role as 'STUDENT' | 'TEACHER' | 'ADMIN',
        grade: student.grade,
      };
    }
  }

  return user;
}
