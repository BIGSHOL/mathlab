import { withAuth } from 'next-auth/middleware';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 점검 모드 — 기본값 ON
 * - 모든 요청을 점검 페이지(`/`)로 redirect
 * - API 요청은 503 JSON 응답
 * - 정적 자산(_next, favicon, .png/.css 등)은 matcher에서 이미 제외
 *
 * 운영자 우회 방법 — 전체 사이트 (시크릿 URL + 쿠키):
 *   1. Vercel 환경 변수에 `MAINTENANCE_BYPASS_TOKEN=<랜덤문자열>` 설정
 *   2. `https://<도메인>/?unlock=<그_값>` 방문 → 쿠키 발급 + /login redirect
 *   3. 이후 30일간 점검 모드 우회 (브라우저별로 유지)
 *   4. 우회 해제: `https://<도메인>/?lock=1` 방문 → 쿠키 삭제
 *
 * 외부 사용자 우회 — 기출분석 기능 전용:
 *   1. Vercel 환경 변수에 `EXAM_ANALYSIS_BYPASS_TOKEN=<다른_랜덤문자열>` 설정
 *   2. `https://<도메인>/?exam_unlock=<그_값>` 방문 → 쿠키 발급 + /login redirect
 *   3. OWNER/TEACHER 계정 로그인 → /exam-analysis 만 접근 가능 (30일)
 *   4. 우회 해제: `https://<도메인>/?exam_lock=1`
 *   ⚠️ MAINTENANCE_BYPASS_TOKEN과 반드시 다른 값 사용
 *
 * 운영 재개 방법:
 *   1. Vercel 환경 변수 `MAINTENANCE_MODE=false` 설정 후 redeploy
 *   2. 또는 이 파일을 git revert
 *
 * 로컬 개발: .env.local 에 `MAINTENANCE_MODE=false` 추가
 */
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE !== 'false';
const BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN || '';
const BYPASS_COOKIE = 'maintenance_bypass';
const EXAM_BYPASS_TOKEN = process.env.EXAM_ANALYSIS_BYPASS_TOKEN || '';
const EXAM_BYPASS_COOKIE = 'exam_analysis_bypass';

/** 점검 모드에서도 통과시킬 경로 */
const MAINTENANCE_ALLOWED_EXACT = new Set(['/']);
const MAINTENANCE_ALLOWED_PREFIX = ['/_next/', '/favicon'];
/** 점검 모드에서도 통과시킬 동적 경로 패턴 (네이버 블로그 등 외부 임베드 호환) */
const MAINTENANCE_ALLOWED_PATTERNS = [
  // 기출 분석 차트 PNG — 블로그 글에 외부 임베드되므로 점검 중에도 익명 접근 허용
  /^\/api\/exam-analysis\/[^/]+\/chart\//,
];

/** 기출분석 우회 토큰 보유자가 접근 가능한 경로 */
const EXAM_ALLOWED_EXACT = new Set([
  '/',                              // 점검 페이지 (토큰 재발급용)
  '/login',                         // NextAuth 로그인
  '/exam-analysis',                 // 메인
  '/api/exam-analysis',             // 시험지 목록 GET/POST (슬래시 없는 정확 경로 — PREFIX와 별도 명시)
  '/api/tenant/current',            // 로그인 폼 테넌트 조회
  '/api/licenses/tenant-features',  // 사이드바 메뉴 필터링
]);
const EXAM_ALLOWED_PREFIX = [
  '/_next/',
  '/favicon',
  '/api/auth/',                     // NextAuth 콜백 + useSession 폴링
  '/exam-analysis/',                // /admin, /admin/trends, /[id]/print
  '/api/exam-analysis/',            // 모든 분석 API (권한 가드 자체 동작)
];

/**
 * 시간 안정 문자열 비교 (timing attack 방지)
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** 요청의 쿠키에서 우회 토큰 종류 판별. 두 쿠키 모두 보유 시 'full'이 우선. */
function getBypassType(req: NextRequest): 'full' | 'exam-analysis' | null {
  if (BYPASS_TOKEN) {
    const t = req.cookies.get(BYPASS_COOKIE)?.value;
    if (t && safeCompare(t, BYPASS_TOKEN)) return 'full';
  }
  if (EXAM_BYPASS_TOKEN) {
    const t = req.cookies.get(EXAM_BYPASS_COOKIE)?.value;
    if (t && safeCompare(t, EXAM_BYPASS_TOKEN)) return 'exam-analysis';
  }
  return null;
}

/** 기출분석 토큰 보유자에게 허용된 경로인지 */
function isExamAnalysisAllowed(path: string): boolean {
  if (EXAM_ALLOWED_EXACT.has(path)) return true;
  if (EXAM_ALLOWED_PREFIX.some((p) => path.startsWith(p))) return true;
  return false;
}

/**
 * Host 헤더에서 서브도메인 추출.
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

/** 인증이 필요한 경로 prefix (점검 모드 OFF 또는 우회된 사용자) */
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
  const url = req.nextUrl;

  // ── 시크릿 URL 처리: /?unlock=<token> ──
  if (path === '/' && BYPASS_TOKEN) {
    const unlockParam = url.searchParams.get('unlock');
    if (unlockParam && safeCompare(unlockParam, BYPASS_TOKEN)) {
      // 쿠키 발급 후 /login으로 redirect (쿼리 제거)
      const redirectUrl = new URL('/login', req.url);
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set(BYPASS_COOKIE, BYPASS_TOKEN, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30일
        path: '/',
      });
      return response;
    }

    // ── 시크릿 URL: /?lock=1 → 쿠키 삭제 ──
    if (url.searchParams.get('lock') === '1') {
      const response = NextResponse.redirect(new URL('/', req.url));
      response.cookies.delete(BYPASS_COOKIE);
      return response;
    }
  }

  // ── 시크릿 URL: /?exam_unlock=<token> → 기출분석 전용 쿠키 발급 ──
  if (path === '/' && EXAM_BYPASS_TOKEN) {
    const examUnlockParam = url.searchParams.get('exam_unlock');
    if (examUnlockParam && safeCompare(examUnlockParam, EXAM_BYPASS_TOKEN)) {
      const response = NextResponse.redirect(new URL('/login', req.url));
      response.cookies.set(EXAM_BYPASS_COOKIE, EXAM_BYPASS_TOKEN, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30일
        path: '/',
      });
      return response;
    }

    // ── 시크릿 URL: /?exam_lock=1 → 기출분석 쿠키 삭제 ──
    if (url.searchParams.get('exam_lock') === '1') {
      const response = NextResponse.redirect(new URL('/', req.url));
      response.cookies.delete(EXAM_BYPASS_COOKIE);
      return response;
    }
  }

  // ── 1단계: 점검 모드 ──
  const bypassType = getBypassType(req);

  // (a) 우회 없음 + 점검 ON → 기존 점검 동작
  if (MAINTENANCE_MODE && bypassType === null) {
    if (MAINTENANCE_ALLOWED_EXACT.has(path)) {
      return NextResponse.next();
    }
    if (MAINTENANCE_ALLOWED_PREFIX.some((p) => path.startsWith(p))) {
      return NextResponse.next();
    }
    if (MAINTENANCE_ALLOWED_PATTERNS.some((p) => p.test(path))) {
      return NextResponse.next();
    }

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

    return NextResponse.redirect(new URL('/', req.url));
  }

  // (b) 기출분석 전용 우회 + 점검 ON → 화이트리스트 외 경로는 /exam-analysis로 흡수
  if (MAINTENANCE_MODE && bypassType === 'exam-analysis') {
    if (!isExamAnalysisAllowed(path)) {
      if (path.startsWith('/api/')) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN_EXAM_BYPASS',
              message: '이 토큰은 기출분석 기능 전용입니다.',
            },
          },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL('/exam-analysis', req.url));
    }
    // 화이트리스트 통과 → 아래 2단계 인증 가드로 위임
  }

  // bypassType === 'full' 또는 MAINTENANCE_MODE === false → 그대로 진행

  // ── 2단계: 평소 인증 가드 (점검 모드 OFF 또는 우회된 사용자) ──
  if (isAuthProtected(path)) {
    return (authMiddleware as unknown as (req: NextRequest) => Response)(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
