/**
 * AI 응답 후처리 유틸
 *
 * JSON 파싱 시 발생하는 이스케이프 충돌 복원, 코드 펜스 제거 등
 * 범용적으로 사용 가능한 후처리 함수 모음
 */

/**
 * JSON 파싱 후 LaTeX 이스케이프 복원
 *
 * JSON의 \t, \f, \b가 LaTeX 명령어(\times, \frac, \begin)와 충돌하는 문제 수정
 * 예: \times → JSON에서 \t → tab문자 + "imes" → 복원하여 \times
 */
export function fixLatexEscaping(text: string): string {
  if (!text) return text;
  return text
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\x08/g, '\\b')
    .replace(/\r(?!\n)/g, '\\r')
    // \\n 리터럴 → 실제 줄바꿈 (LaTeX 명령어 \nabla 등은 보호)
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    // \dfrac → \frac (인라인 수식에서 거대 분수 방지)
    .replace(/\\dfrac(?![a-zA-Z])/g, '\\frac');
}

/**
 * Gemini 응답에서 JSON 코드 펜스 제거
 *
 * Gemini가 ```json ... ``` 또는 ``` ... ```로 감쌀 수 있음
 */
export function stripCodeFence(text: string): string {
  let result = text.trim();
  if (result.startsWith('```json')) {
    result = result.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (result.startsWith('```')) {
    result = result.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return result;
}

/**
 * 객체의 모든 문자열 필드에 fixText 함수 적용 (재귀)
 *
 * @param obj - 대상 객체
 * @param fixText - 텍스트 변환 함수
 * @param maxDepth - 최대 재귀 깊이 (기본: 5)
 */
export function deepFixText<T>(
  obj: T,
  fixText: (text: string) => string,
  maxDepth = 5,
): T {
  if (maxDepth <= 0) return obj;
  if (typeof obj === 'string') return fixText(obj) as T;
  if (Array.isArray(obj)) {
    return obj.map((item) => deepFixText(item, fixText, maxDepth - 1)) as T;
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepFixText(value, fixText, maxDepth - 1);
    }
    return result as T;
  }
  return obj;
}

/**
 * base64 이미지에서 data URL prefix 제거
 * "data:image/png;base64,..." → 순수 base64 문자열
 */
export function stripDataUrlPrefix(base64: string): string {
  return base64.replace(/^data:image\/\w+;base64,/, '');
}

/**
 * base64 이미지 크기 추정 (바이트)
 */
export function estimateBase64Size(base64: string): number {
  const clean = stripDataUrlPrefix(base64);
  return (clean.length * 3) / 4;
}
