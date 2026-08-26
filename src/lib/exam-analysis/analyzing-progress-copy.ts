/**
 * 분석 중 실행 로그 — 서버 analysisStep 1~4 와 1:1.
 * 가짜 세부 단계(유형 분류/난이도 추정 반복)는 쓰지 않는다.
 */
export type AnalyzingSubject = 'MATH' | 'ENGLISH';

/** step 1~4 진입 로그 (analyze/route setStep 과 동일 문구) */
export const ANALYZING_STEP_LOGS: Record<AnalyzingSubject, string[]> = {
  MATH: [
    '시험지 파일을 불러오는 중',
    '학년/과목 분석 규칙 준비',
    'AI 분석 호출 — 문항/난이도/유형/단원 추출',
    '분석 결과 검증 및 저장',
  ],
  ENGLISH: [
    '시험지 파일을 불러오는 중',
    '학년/과목 분석 규칙 준비',
    'AI 분석 호출 — 문항/난이도/유형/영역 추출',
    '분석 결과 검증 및 저장',
  ],
};
