import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Teacher-only routes
    if (path.startsWith('/students') || path.startsWith('/analytics') || path.startsWith('/questions')) {
      if (token?.role === 'STUDENT') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
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
  ],
};
