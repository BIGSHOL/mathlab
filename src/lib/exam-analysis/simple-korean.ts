/** 학부모·선생님이 바로 읽는 쉬운 말. 긴 구부터 치환. */
const SIMPLE_KO_PHRASES: Array<[string, string]> = [
  ['호혜적 교환', '서로 주고받는 관계'],
  ['호혜적', '서로 주고받는'],
  ['함축적 의미를', '숨은 뜻을'],
  ['함축 의미를', '숨은 뜻을'],
  ['함축적 의미', '숨은 뜻'],
  ['함축 의미', '숨은 뜻'],
  ['함축적', '속에 담긴'],
  ['함축', '숨은 뜻'],
  ['환언 파악', '바꿔 말한 내용'],
  ['환언', '바꿔 말하기'],
  ['스캔 품질로 인해 일부 수식 판독이 어렵습니다', '글씨가 흐려 일부는 추정했습니다'],
  ['스캔 품질이 낮아', '글씨가 흐려'],
  ['스캔 품질 낮음', '글씨가 흐림'],
  ['판독 실패 — 번호만 인식', '글씨를 읽기 어려움'],
  ['출제범위 의심', '범위 확인 필요'],
];

export function simplifyExamKorean(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [from, to] of SIMPLE_KO_PHRASES) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}
