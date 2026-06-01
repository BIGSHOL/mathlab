'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types';

// 역할 계층 (서버의 ROLE_LEVEL과 동일)
const ROLE_LEVEL: Record<string, number> = {
  STUDENT: 0, TEACHER: 1, MANAGER: 2, OWNER: 3, SUPER_ADMIN: 4,
};

/** 클라이언트 사이드 역할 체크 */
export function hasRoleClient(userRole: string | undefined, minRole: UserRole): boolean {
  if (!userRole) return false;
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user
    ? {
        id: (session.user as { id: string }).id,
        name: session.user.name ?? '',
        username: (session.user as { username: string }).username,
        role: (session.user as { role: string }).role as UserRole,
        grade: (session.user as { grade: number | null }).grade,
        tenantName: (session.user as { tenantName?: string | null }).tenantName ?? null,
      }
    : null;

  const login = async (username: string, password: string) => {
    const result = await signIn('credentials', { username, password, redirect: false });
    if (result?.error) throw new Error('로그인 실패');
    router.push('/exam-analysis');
    router.refresh();
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return { user, status, login, logout, isLoading: status === 'loading' };
}
