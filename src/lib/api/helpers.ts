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
  errorMessage: string,
): Promise<T | NextResponse> {
  const resource = await findFn();
  if (!resource) return notFound(errorMessage);
  return resource;
}

/** 숫자 클램프 유틸 — Math.min(Math.max(min, value), max) 단축 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), max);
}

/**
 * 개념 fullContent 정규화:
 * 1. blockquote(>) 마커 제거
 * 2. 줄 시작 "N." (마크다운 리스트 문법)을 ① ② 동그라미 숫자로 변환
 */
const CIRCLED_NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
export function normalizeConceptContent(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      let l = line.replace(/^>\s?/, '');
      l = l.replace(/^\s*(\d{1,2})\.\s/, (m, g1) => {
        const n = parseInt(g1, 10);
        const circled = CIRCLED_NUMBERS[n - 1];
        if (!circled) return m;
        const indent = m.match(/^\s*/)?.[0] ?? '';
        return `${indent}${circled} `;
      });
      return l;
    })
    .join('\n');
}

/** 숙제 플랜 GET 공통 — 테넌트 내 전체 (getTenantFilter로 격리) */
export function homeworkCreatedByFilter(_user: AuthUser): string | undefined {
  return undefined;
}
