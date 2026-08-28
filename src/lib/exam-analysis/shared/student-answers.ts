/**
 * 학생 답안(채점 결과) 존재 판정 — **엄격 boolean 확인**만 허용한다.
 *
 * ⚠️ `is_correct !== null` 로 판정하면 안 된다.
 *    `questions` 는 Prisma `Json` 에서 오므로 타입은 런타임에 사라진다 (CLAUDE.md #11).
 *    하드닝(`ai-engine.ts`)은 **새 분석본에만** `is_correct: null` 을 넣고,
 *    그 이전에 저장된 행에는 **키 자체가 없다**. `undefined !== null` 이 참이라
 *    레거시 문항(또는 AI가 `"false"` 같은 문자열을 준 문항)이 전부 "답안 있음"으로 잡히고,
 *    이어지는 `=== true` 집계는 0이라 **"정답률 0%"** 라는 가짜 수치가 만들어진다.
 *    그 문장은 KPI 블록 → 블로그 이미지 캡션까지 그대로 발행된다.
 *
 * 이 제품은 학생 답안지를 받지 않으므로 정상 경로에서는 항상 "없음" 이어야 한다.
 * 판정 로직을 블록/화면마다 재구현하지 말고 반드시 여기를 거칠 것.
 */

/** 채점 결과가 실제로 들어 있는 문항만 — `true`/`false` 인 것만 통과 */
export function gradedQuestions<T extends { is_correct?: unknown }>(questions: readonly T[]): T[] {
  return questions.filter((q) => q.is_correct === true || q.is_correct === false);
}

/** 학생 답안 데이터가 하나라도 있는가 */
export function hasStudentAnswers(questions: readonly { is_correct?: unknown }[]): boolean {
  return questions.some((q) => q.is_correct === true || q.is_correct === false);
}

/** 정답률(%) — 채점된 문항이 없으면 `null` (0% 가 아니다) */
export function correctRatePct(questions: readonly { is_correct?: unknown }[]): number | null {
  const graded = gradedQuestions(questions);
  if (graded.length === 0) return null;
  return Math.round((graded.filter((q) => q.is_correct === true).length / graded.length) * 100);
}
