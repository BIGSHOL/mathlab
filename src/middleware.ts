import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Host 헤더에서 서브도메인 추출.
 * - gangnam.mathlab.com → "gangnam"
 * - mathlab.com → null (본사)
 * - gangnam.localhost:3000 → "gangnam" (로컬 개발)
 * - localhost:3000 → null
 */
function extractSubdomain(hostname: string): string | null {
  // 포트 제거
  const host = hostname.split(':')[0];
  const parts = host.split('.');

  // xxx.localhost (로컬 개발)
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0] === 'localhost' ? null : parts[0];
  }

  // xxx.domain.tld (프로덕션)
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== 'www' && sub !== 'api') return sub;
  }

  return null;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const hostname = req.headers.get('host') || '';
    const subdomain = extractSubdomain(hostname);

    // 서브도메인을 다운스트림에 전달 (API 라우트, 서버 컴포넌트에서 읽기용)
    const response = NextResponse.next();
    if (subdomain) {
      response.headers.set('x-tenant-slug', subdomain);
    }

    // Teacher-only routes
    if (path.startsWith('/students') || path.startsWith('/analytics') || path.startsWith('/questions')) {
      if (token?.role === 'STUDENT') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // 로그인 페이지, 테넌트 정보 API는 인증 불필요
        const path = req.nextUrl.pathname;
        if (path === '/login' || path.startsWith('/api/tenant/')) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/subjects/:path*',
    '/concepts/:path*',
    '/ranking/:path*',
    '/profile/:path*',
    '/students/:path*',
    '/analytics/:path*',
    '/questions/:path*',
    '/overview/:path*',
    '/admin/:path*',
  ],
};
