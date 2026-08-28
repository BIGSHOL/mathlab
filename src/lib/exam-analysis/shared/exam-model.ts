/**
 * 시험지 분석 모델 id — **단일 소스**.
 *
 * ai-engine(실제 호출)과 cli-llm(DB `modelVersion` 기록)이 같은 값을 봐야 한다.
 * 예전엔 두 곳에 각각 문자열이 박혀 있어 모델을 바꾸면 기록만 옛 이름으로 남았다
 * (§12-13). 순환 import 를 피하려고 상수만 여기 둔다 — 이 파일은 아무것도 import 하지 않는다.
 */
export const EXAM_ANALYSIS_MODEL = 'gemini-3.7-flash';
