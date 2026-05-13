import { withAuth } from 'next-auth/middleware';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 점검 모드 — 기본값 ON
 * - 모든 요청을 점검 페이지(`/`)로 redirect
 * - API 요청은 503 JSON 응답
 * - 정적 자산(_next, favicon, .png/.css 등)은 matcher에서 이미 제외
 *
 * 운영 재개 방법 (택 1):
 *   1. Vercel 환경 변수 `MAINTENANCE_MODE=false` 설정 후 redeploy
 *   2. 로컬에서 이 파일을 git revert 또는 아래 라인을 `=== 'true'`로 변경
 *
 * 로컬 개발 시: .env.local 에 `MAINTENANCE_MODE=false` 추가하면 평소처럼 사용 가능
 */
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE !== 'false';

/** 점검 모드에서도 통과시킬 경로 */
const MAINTENANCE_ALLOWED_EXACT = new Set(['/']);
const MAINTENANCE_ALLOWED_PREFIX = ['/_next/', '/favicon'];

/**
 * Host 헤더에서 서브도메인 추출.
 * - gangnam.mathlab.com → "gangnam"
 * - mathlab.com → null (본사)
 * - gangnam.localhost:3000 → "gangnam" (로컬 개발)
 * - localhost:3000 → null
 */
function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];
  const parts = host.split('.');
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0] === 'localhost' ? null : parts[0];
  }
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== 'www' && sub !== 'api') return sub;
  }
  return null;
}

/** 인증이 필요한 경로 prefix (점검 모드 OFF 시 사용) */
const AUTH_PROTECTED_PREFIXES = [
  '/dashboard',
  '/subjects',
  '/concepts',
  '/ranking',
  '/profile',
  '/students',
  '/analytics',
  '/questions',
  '/overview',
  '/admin',
];

function isAuthProtected(path: string): boolean {
  return AUTH_PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + '/'),
  );
}

/** 기존 인증 가드 (NextAuth withAuth) */
const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const hostname = req.headers.get('host') || '';
    const subdomain = extractSubdomain(hostname);

    const response = NextResponse.next();
    if (subdomain) {
      response.headers.set('x-tenant-slug', subdomain);
    }

    // Teacher+ routes (TEACHER/MANAGER/OWNER/SUPER_ADMIN)
    if (
      path.startsWith('/students') ||
      path.startsWith('/analytics') ||
      path.startsWith('/questions')
    ) {
      if (token?.role === 'STUDENT') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path === '/login' || path.startsWith('/api/tenant/')) return true;
        return !!token;
      },
    },
  },
);

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ── 1단계: 점검 모드 ──
  if (MAINTENANCE_MODE) {
    // 허용 경로는 통과
    if (MAINTENANCE_ALLOWED_EXACT.has(path)) {
      return NextResponse.next();
    }
    if (MAINTENANCE_ALLOWED_PREFIX.some((p) => path.startsWith(p))) {
      return NextResponse.next();
    }

    // API 요청은 503 JSON
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        {
          error: {
            code: 'MAINTENANCE',
            message: '시스템 점검 중입니다. 잠시 후 다시 이용해 주세요.',
          },
        },
        { status: 503 },
      );
    }

    // 그 외 모든 경로 → 점검 페이지로 redirect
    return NextResponse.redirect(new URL('/', req.url));
  }

  // ── 2단계: 평소 인증 가드 (보호 라우트만) ──
  if (isAuthProtected(path)) {
    // withAuth 함수는 NextRequest를 받음 — 타입 단언 필요
    return (authMiddleware as unknown as (req: NextRequest) => Response)(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 정적 자산 제외 모든 요청
    // - _next/static, _next/image, favicon.ico
    // - 확장자 있는 파일 (.png, .css, .js 등)
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
