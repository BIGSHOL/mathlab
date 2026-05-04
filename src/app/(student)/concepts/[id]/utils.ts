/** 정답이 LaTeX 수식($...$)인지 판별 */
export function isLatexAnswer(answer: string): boolean {
  return answer.startsWith('$') && answer.endsWith('$') && answer.length > 2;
}

/** 복잡한 수식인지 판별 (MathLive 입력기 필요 여부) */
export function isComplexLatex(answer: string): boolean {
  if (!isLatexAnswer(answer)) return false;
  const inner = answer.slice(1, -1);
  // 단순: 숫자, 영문자, 공백, 콤마, 점, +, -, = 만
  return !/^[0-9a-zA-Z\s,.\-+=]+$/.test(inner);
}

/** 정답에서 $...$ 를 벗겨서 표시용 텍스트로 반환 */
export function stripLatexWrap(answer: string): string {
  if (answer.startsWith('$') && answer.endsWith('$') && answer.length > 2) {
    return answer.slice(1, -1);
  }
  return answer;
}

export function getStoredFontSize(): number {
  if (typeof window === 'undefined') return 0;
  const v = localStorage.getItem('concept-font-size');
  const n = v ? parseInt(v, 10) : 0;
  return n >= 0 && n <= 3 ? n : 0;
}

/** Fisher-Yates 셔플 — buildChipPool 내부 전용 */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** 빈칸 정답을 셔플된 칩 풀로 변환 (같은 정답 → 1칩 + xN 라벨) */
export function buildChipPool(blanks: Array<{ answer: string }>): { answer: string; total: number; used: number }[] {
  const counts = new Map<string, number>();
  for (const b of blanks) {
    counts.set(b.answer, (counts.get(b.answer) ?? 0) + 1);
  }
  return shuffleArray(
    Array.from(counts.entries()).map(([answer, total]) => ({ answer, total, used: 0 }))
  );
}
