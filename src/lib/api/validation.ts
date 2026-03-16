import { NextRequest, NextResponse } from 'next/server';
import { ZodType } from 'zod';

/** searchParams → Zod 검증. 실패 시 400 NextResponse 반환 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodType<T>
): T | NextResponse {
  const { searchParams } = new URL(request.url);
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '잘못된 쿼리 파라미터' } },
      { status: 400 }
    );
  }
  return parsed.data;
}

/** JSON body → Zod 검증. 실패 시 400 NextResponse 반환 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodType<T>
): Promise<T | NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '올바른 JSON이 아닙니다' } },
      { status: 400 }
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값이 올바르지 않습니다',
          details: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      },
      { status: 400 }
    );
  }
  return parsed.data;
}
