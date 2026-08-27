/**
 * 수학 기출 분석 상수 — 영어 파이프라인과 공유하지 않는 수학 전용 정의.
 * 2026-08 과목 분리: 옛 constants.ts 에서 행 단위로 잘라냈다. **값은 한 글자도 바꾸지 않았다.**
 * 여기에 영어 키를 넣지 말 것 — 섞이는 순간 분리가 무너진다.
 */

// ── 프롬프트 버전 ──
// 프롬프트 변경 시 반드시 버전 업! 분석 결과에 기록되어 버전별 비교 가능
// v1.0.5 (2026-05-14): 문항 번호 누락 금지 룰 추가 + 후처리 갭 자동 보정 (평균 기반 정밀 추측)
// v1.1.0 (2026-05-27): Gemini 3.1 Pro Preview 업그레이드 + confidence_reason 화이트리스트 + JSON 안전 출력 가이드 (ai_comment LaTeX 금지) + 8개 학년/학기 단원명 curriculum.ts 동기화
// v1.2.0 (2026-05-27): 난이도/신뢰도 하네스 강화 — H11 5단계 절대 기준(정답률) + H12 6축 종합 평가 + H13 분포 강제(3에 몰지 마라) + H14 위치 휴리스틱 + H15 신뢰도 5단계 매핑 + H16 reason↔value 매핑 + H17 일률 출력 금지 (95% 모두 동일 금지) + V10~V13 자기검증 룰 + schema 예시 다양화 (4단계/서술형/0.82/0.78 포함)
// v1.3.0 (2026-05-29): 난이도 2축 모델 — 결합 폭(breadth) + 사고 깊이(depth) 분리.
//   "개념 수 적어도 비자명한 통찰 필요하면 4~5" 규칙 추가 → 단일 개념 고난도 문항 포착.
//   실데이터 검증: 응용(3) 37% 최빈값·기본(1) 10.6%·가중평균 2.83 상향 편향 → 2축으로 교정.
//   "애매하면 한 단계 낮게"를 폭에만 적용, 깊이 명확 시 하향 금지.
// v1.4.0 (2026-05-29): 수학 난이도 충돌 제거 — 공통 DIFFICULTY_SYSTEM_FRAMEWORK(옛 개념-수 정의
//   + "애매하면 한 단계 낮게" 하향 편향)가 2축 모델과 충돌해 난이도가 계속 2~3에 몰리던 문제.
//   수학은 MATH_DIFFICULTY_SYSTEM_4LEVEL(2축)만 사용하도록 분리, 공통 프레임워크는 영어 전용.
// v1.5.0 (2026-06-17): 문항 유형(내용영역) 분류 5대 → 2022 개정 4대 영역 전환.
//   수와 연산 / 변화와 관계(←문자와 식·함수) / 도형과 측정(←기하) / 자료와 가능성(←확률과 통계).
// v1.6.0 (2026-07-27): 문항 누락 방지 — exam_info.total_questions/total_points 를 "시험지에서 직접 읽은 값"으로
//   명시(자기 출력 합계에 맞추지 말 것) + 마지막 서술형 누락 금지 룰 + 출력 전 자기점검 2문항.
//   계기: 경명여중1 동일 PDF 재분석에서 22문항/100점 → 21문항/90점(마지막 10점 서술형 누락).
//   AI가 신고값을 자기 출력에 맞춰버리면 누락 감지 기준 자체가 사라지므로 프롬프트로 강제.
//   (엔진 측 대응: assessCompleteness 감지 → 재분석 1회 → 잔여분 placeholder + readiness 차단)
export const PROMPT_VERSION = 'v1.6.0';

// ── 4대 교육과정 영역 (문항 유형, 2022 개정) ──
export const EXAM_QUESTION_TYPES = {
  NUMBER: { label: '수와 연산', labelEn: 'Number & Operations' },
  CHANGE_RELATION: { label: '변화와 관계', labelEn: 'Change & Relationship' },
  SHAPE_MEASURE: { label: '도형과 측정', labelEn: 'Geometry & Measurement' },
  DATA_POSSIBILITY: { label: '자료와 가능성', labelEn: 'Data & Possibility' },
} as const;

export type ExamQuestionTypeKey = keyof typeof EXAM_QUESTION_TYPES;

// 4대 영역 키 배열
export const QUESTION_TYPE_KEYS = ['number', 'change_relation', 'shape_measure', 'data_possibility'] as const;

// 4대 영역 라벨 (lowercase key) + 옛 5대 키 호환 별칭(과거 분석본 라벨 미표시 방지)
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  number: '수와 연산',
  change_relation: '변화와 관계',
  shape_measure: '도형과 측정',
  data_possibility: '자료와 가능성',
  // 옛 키 호환 — 신 영역 라벨로 흡수
  algebra: '변화와 관계',
  function: '변화와 관계',
  geometry: '도형과 측정',
  statistics: '자료와 가능성',
};

// ── Gemini raw question_type → 4대 교육과정 영역 정규화 (옛 키도 신 영역으로 흡수) ──
export const TYPE_TO_STANDARD: Record<string, string> = {
  // 수와 연산
  number: 'number',
  calculation: 'number',
  // 변화와 관계 (문자와 식·방정식·부등식·함수·규칙성)
  change_relation: 'change_relation',
  algebra: 'change_relation',
  equation: 'change_relation',
  inequality: 'change_relation',
  function: 'change_relation',
  graph: 'change_relation',
  calculus: 'change_relation',
  sequence: 'change_relation',
  application: 'change_relation',
  problem_solving: 'change_relation',
  proof: 'change_relation',
  // 도형과 측정 (기하·삼각비·벡터·측정)
  shape_measure: 'shape_measure',
  geometry: 'shape_measure',
  vector: 'shape_measure',
  trigonometry: 'shape_measure',
  understanding: 'shape_measure',
  // 자료와 가능성 (확률·통계·경우의 수·집합)
  data_possibility: 'data_possibility',
  statistics: 'data_possibility',
  probability: 'data_possibility',
  set: 'data_possibility',
};

// ── 수학 능력 영역 (MathLab 기존 4대 영역과 동일) ──
export const ABILITY_DOMAINS = {
  CALCULATION: { label: '계산력', labelEn: 'Calculation', color: '#3B82F6' },
  UNDERSTANDING: { label: '이해력', labelEn: 'Understanding', color: '#10B981' },
  PROBLEM_SOLVING: { label: '문제해결력', labelEn: 'Problem Solving', color: '#F97316' },
  REASONING: { label: '추론력', labelEn: 'Reasoning', color: '#8B5CF6' },
} as const;

export type AbilityDomainKey = keyof typeof ABILITY_DOMAINS;

// ── question_type(4대 영역) → ability_domain(4대 능력) 기본 매핑 ──
// AI가 ability_domain을 직접 반환하므로 이건 fallback용. 옛 키도 호환 유지.
export const TYPE_TO_DOMAIN: Record<string, string> = {
  number: 'calculation',
  change_relation: 'understanding',
  shape_measure: 'understanding',
  data_possibility: 'problem_solving',
  // 옛 키 호환
  algebra: 'understanding',
  function: 'understanding',
  geometry: 'understanding',
  statistics: 'problem_solving',
};

// ── 능력 영역 라벨/색상 (lowercase key) ──
export const ABILITY_DOMAIN_LABELS: Record<string, string> = {
  calculation: '계산력',
  understanding: '이해력',
  problem_solving: '문제해결력',
  reasoning: '추론력',
};

export const ABILITY_DOMAIN_COLORS: Record<string, string> = {
  calculation: ABILITY_DOMAINS.CALCULATION.color,
  understanding: ABILITY_DOMAINS.UNDERSTANDING.color,
  problem_solving: ABILITY_DOMAINS.PROBLEM_SOLVING.color,
  reasoning: ABILITY_DOMAINS.REASONING.color,
};

// ── 4대 영역 색상 (UI용) — 수학 몫 ──
export const MATH_QUESTION_TYPE_COLORS: Record<string, string> = {
  // 4대 교육과정 영역 (2022 개정)
  number: '#6366F1',           // indigo
  change_relation: '#8B5CF6',  // purple
  shape_measure: '#14B8A6',    // teal
  data_possibility: '#F59E0B', // amber
  // 옛 키 호환 — 신 영역 색으로 흡수(과거 분석본 회색폴백 방지)
  algebra: '#8B5CF6',
  function: '#8B5CF6',
  geometry: '#14B8A6',
  statistics: '#F59E0B',
};
