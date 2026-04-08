// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = Record<string, any>;

/** 숫자 추출 헬퍼 — NaN이면 fallback */
export function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

/** 배열 추출 헬퍼 — 배열이 아니면 빈 배열 */
export function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}

export type { P };
