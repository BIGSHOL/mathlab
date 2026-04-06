import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        tenantSlug: { label: 'TenantSlug', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username, deletedAt: null },
          include: { tenant: { select: { id: true, slug: true, name: true, logo: true } } },
        });

        if (!user) return null;

        // 서브도메인 검증: tenantSlug가 있으면 사용자의 테넌트와 일치해야 함
        const tenantSlug = credentials.tenantSlug;
        if (tenantSlug && user.role !== 'SUPER_ADMIN') {
          if (!user.tenant || user.tenant.slug !== tenantSlug) {
            return null; // 이 지점에 등록된 계정이 아님
          }
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.username, // NextAuth requires email field, we use username
          role: user.role,
          grade: user.grade,
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug ?? null,
          tenantName: user.tenant?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.grade = (user as unknown as { grade: number | null }).grade;
        token.username = user.email; // we stored username in email
        token.tenantId = (user as unknown as { tenantId: string | null }).tenantId;
        token.tenantSlug = (user as unknown as { tenantSlug: string | null }).tenantSlug;
        token.tenantName = (user as unknown as { tenantName: string | null }).tenantName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { grade: number | null }).grade = token.grade as number | null;
        (session.user as { username: string }).username = token.username as string;
        (session.user as { tenantId: string | null }).tenantId = (token.tenantId as string | null) ?? null;
        (session.user as { tenantSlug: string | null }).tenantSlug = (token.tenantSlug as string | null) ?? null;
        (session.user as { tenantName: string | null }).tenantName = (token.tenantName as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Get current session user from server-side */
export async function getCurrentUser() {
  const { getServerSession } = await import('next-auth');
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as {
    id: string;
    name: string;
    username: string;
    role: 'STUDENT' | 'TEACHER' | 'MANAGER' | 'OWNER' | 'SUPER_ADMIN';
    grade: number | null;
    tenantId: string | null;
    tenantSlug: string | null;
    tenantName: string | null;
  };
}
