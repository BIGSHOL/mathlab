import { NextResponse, type NextRequest } from 'next/server';

/**
 * 기출분석 전용 앱 미들웨어.
 *
 * 역할: Host 서브도메인 → `x-tenant-slug` 헤더 주입 (resolveCurrentTenant 용).
 * 인증은 레이아웃(getCurrentUser → /login)과 API 가드(requireTeacher)가 처리하므로
 * 미들웨어는 라우트를 차단하지 않는다. (기존 점검 모드/우회 토큰 로직은 전용화하며 제거)
 */

/** Host 헤더에서 서브도메인 추출 */
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

export default function middleware(req: NextRequest) {
  const subdomain = extractSubdomain(req.headers.get('host') || '');
  const response = NextResponse.next();
  if (subdomain) {
    response.headers.set('x-tenant-slug', subdomain);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
