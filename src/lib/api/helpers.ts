import { NextResponse } from 'next/server';
import { notFound } from './errors';
import type { AuthUser } from './auth';

/** NextResponse 타입 가드 — auth/validation 결과 분기에 사용 */
export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/** 리소스 조회 + 없으면 404. findFn이 null 반환 시 자동 404 응답 */
export async function requireResource<T>(
  findFn: () => Promise<T | null>,
  errorMessage: string
): Promise<T | NextResponse> {
  const resource = await findFn();
  if (!resource) return notFound(errorMessage);
  return resource;
}

/** 숫자 클램프 유틸 — Math.min(Math.max(min, value), max) 단축 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), max);
}

/** 숙제 플랜 GET 공통 — TEACHER는 자기 것만, ADMIN은 전체 */
export function homeworkCreatedByFilter(user: AuthUser): string | undefined {
  return user.role === 'TEACHER' ? user.id : undefined;
}
