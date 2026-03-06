'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user
    ? {
        id: (session.user as { id: string }).id,
        name: session.user.name ?? '',
        username: (session.user as { username: string }).username,
        role: (session.user as { role: string }).role as 'STUDENT' | 'TEACHER' | 'ADMIN',
        grade: (session.user as { grade: number | null }).grade,
      }
    : null;

  const login = async (username: string, password: string) => {
    const result = await signIn('credentials', { username, password, redirect: false });
    if (result?.error) throw new Error('로그인 실패');
    router.push('/dashboard');
    router.refresh();
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return { user, status, login, logout, isLoading: status === 'loading' };
}
