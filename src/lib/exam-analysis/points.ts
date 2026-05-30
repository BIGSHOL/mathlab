/**
 * 배점(points) 부동소수점 유틸 — 소수 배점(예: 4.6) 누적 합산 시 발생하는 오차 제거.
 *
 * 문제: `4.6 + 4.6 + ... = 100.00000000000003` (IEEE-754 누적 오차)
 *  → `pointsSum !== 100` 비교 실패 → "배점 합계 100.00000000000003점" 표시
 *  → 자동 보정이 `diff = 2.84e-14`를 만들어 `4.6 - 2.84e-14 = 4.599999999999971` 같은 쓰레기 값 생성
 *
 * 해결: 배점 합산/비교/표시를 반드시 이 유틸을 거쳐 소수 2자리로 정규화한다.
 * (한국 시험 배점은 정수 또는 0.5/0.1 단위 → 소수 2자리면 충분히 안전)
 *
 * ⚠️ 새 코드에서 배점을 `reduce((s,q)=>s+(q.points??0),0)`로 직접 합산하지 말 것 → `sumPoints` 사용.
 */

/** 배점 1개 반올림 — 소수 2자리. 부동소수점 노이즈(4.599999999999971 → 4.6) 제거. */
export function roundPoints(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** 배점 합산 — 누적 후 반올림. 100.00000000000003 → 100. */
export function sumPoints(values: Array<number | null | undefined>): number {
  return roundPoints(values.reduce<number>((s, v) => s + (v ?? 0), 0));
}

/** 두 배점이 사실상 같은지 (반올림 후 비교) — `pointsSum === total` 대신 사용. */
export function pointsEqual(a: number, b: number): boolean {
  return roundPoints(a) === roundPoints(b);
}

/** 표시용 문자열 — 반올림 후 불필요한 0 제거 ("4.6", "5", "4.5"). null/undefined는 빈 문자열. */
export function formatPoints(n: number | null | undefined): string {
  if (n == null) return '';
  return String(roundPoints(n));
}
