import { NextResponse } from 'next/server';

/** 401 Unauthorized */
export function unauthorized(message = '로그인이 필요합니다') {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  );
}

/** 403 Forbidden */
export function forbidden(message = '권한이 없습니다') {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message } },
    { status: 403 }
  );
}

/** 400 Validation Error */
export function badRequest(
  message = '입력값이 올바르지 않습니다',
  details?: Array<{ field: string; message: string }>
) {
  return NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message, ...(details && { details }) } },
    { status: 400 }
  );
}

/** 404 Not Found */
export function notFound(message: string) {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message } },
    { status: 404 }
  );
}

/** 409 Conflict */
export function conflict(message: string) {
  return NextResponse.json(
    { error: { code: 'CONFLICT', message } },
    { status: 409 }
  );
}

/** 500 Internal Server Error */
export function serverError(message = '서버 오류가 발생했습니다') {
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message } },
    { status: 500 }
  );
}
