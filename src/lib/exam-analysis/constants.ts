/**
 * 기출 분석 상수 정의
 * Math Report 프로젝트에서 이식 — MathLab AI 시스템과 완전 독립
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

/**
 * 분석본의 프롬프트 버전이 현재 PROMPT_VERSION과 다른지(=구버전) 검사.
 * modelVersion 포맷: "gemini-X.Y-z / prompt vA.B.C"
 * 구버전이면 총평 생성을 사전 차단 → 재분석 유도 (구버전 분석 데이터로 총평 생성 방지).
 */
// en-v1.1.0: 교과서 레슨 출제범위
// en-v1.2.0: 내신 지필고사는 원칙적으로 듣기 없음. 대화문은 communication/reading.
// en-v1.3.0: 문항 코멘트는 쉬운 한국어 (호혜적·함축·환언·스캔 품질 등 금지)
// key_vocab / key_structures 는 영어 학습 대책용 선택 필드. 분류 규칙 변경이 아니라서 버전은 유지.
export const ENGLISH_PROMPT_VERSION = 'en-v1.3.0';

export const CURRENT_PROMPT_VERSION = {
  MATH: PROMPT_VERSION,
  ENGLISH: ENGLISH_PROMPT_VERSION,
} as const;

/**
 * 분석본의 프롬프트 버전이 해당 과목의 현재 버전과 다른지(=구버전) 검사.
 * modelVersion 포맷: "gemini-X.Y-z / prompt vA.B.C" 또는 "… / prompt en-vA.B.C"
 * 영어 분석본이 수학 v1.6.0 미포함이라 구버전으로 오판되지 않게 subject 를 넘긴다.
 */
export function isStalePromptVersion(
  modelVersion: string | null | undefined,
  subject: 'MATH' | 'ENGLISH' = 'MATH',
): boolean {
  if (!modelVersion) return false;
  const expected = CURRENT_PROMPT_VERSION[subject] ?? PROMPT_VERSION;
  return !modelVersion.includes(`prompt ${expected}`);
}

/** modelVersion에서 prompt 버전만 추출 (예: "…/ prompt v1.0.5" → "v1.0.5", "…/ prompt en-v1.0.0" → "en-v1.0.0"). */
export function extractPromptVersion(modelVersion: string | null | undefined): string | null {
  if (!modelVersion) return null;
  const m = modelVersion.match(/prompt\s+((?:en-)?v[\d.]+)/i);
  return m ? m[1] : null;
}

// ── 5단계 난이도 (1=쉬움 ~ 5=어려움) ──
export const EXAM_DIFFICULTIES = {
  LEVEL_1: { label: '1', labelEn: 'Level 1', level: 1 },
  LEVEL_2: { label: '2', labelEn: 'Level 2', level: 2 },
  LEVEL_3: { label: '3', labelEn: 'Level 3', level: 3 },
  LEVEL_4: { label: '4', labelEn: 'Level 4', level: 4 },
  LEVEL_5: { label: '5', labelEn: 'Level 5', level: 5 },
} as const;

export type ExamDifficultyKey = keyof typeof EXAM_DIFFICULTIES;

// 구 4단계 → 5단계 매핑 (하위 호환)
export const DIFFICULTY_LEGACY_MAP: Record<string, string> = {
  concept: '1',
  pattern: '2',
  reasoning: '4',
  creative: '5',
};

// 3단계 (하위 호환)
export const DIFFICULTY_3LEVEL_MAP: Record<string, string> = {
  '1': 'low',
  '2': 'low',
  '3': 'medium',
  '4': 'high',
  '5': 'high',
  // 구 키 호환
  concept: 'low',
  pattern: 'medium',
  reasoning: 'high',
  creative: 'high',
};

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

// ── 영어 문항 유형 (내신 6유형) — 수학 TYPE_TO_STANDARD 와 분리 ──
export const ENGLISH_QUESTION_TYPES = {
  GRAMMAR: { label: '어법', labelEn: 'Grammar' },
  VOCABULARY: { label: '어휘', labelEn: 'Vocabulary' },
  READING: { label: '독해', labelEn: 'Reading' },
  LISTENING: { label: '듣기', labelEn: 'Listening' },
  WRITING: { label: '서술·영작', labelEn: 'Writing' },
  COMMUNICATION: { label: '의사소통', labelEn: 'Communication' },
} as const;

export const ENGLISH_QUESTION_TYPE_KEYS = [
  'grammar', 'vocabulary', 'reading', 'listening', 'writing', 'communication',
] as const;

/** 내신 화면 기본 축 — 듣기는 문항이 있을 때만 범례/레이더에 합류. */
export const ENGLISH_NAESIN_TYPE_KEYS = ENGLISH_QUESTION_TYPE_KEYS.filter(
  (k) => k !== 'listening',
) as Exclude<(typeof ENGLISH_QUESTION_TYPE_KEYS)[number], 'listening'>[];

export type EnglishQuestionTypeKey = (typeof ENGLISH_QUESTION_TYPE_KEYS)[number];

export const ENGLISH_QUESTION_TYPE_LABELS: Record<string, string> = {
  grammar: '어법',
  vocabulary: '어휘',
  reading: '독해',
  listening: '듣기',
  writing: '서술·영작',
  communication: '의사소통',
};

/** Gemini raw → 영어 6유형. 수학 TYPE_TO_STANDARD 에 영어 키를 넣지 말 것. */
export const ENGLISH_TYPE_TO_STANDARD: Record<string, string> = {
  grammar: 'grammar',
  어법: 'grammar',
  문법: 'grammar',
  grammar_error: 'grammar',
  vocabulary: 'vocabulary',
  vocab: 'vocabulary',
  어휘: 'vocabulary',
  reading: 'reading',
  독해: 'reading',
  reading_main_idea: 'reading',
  reading_detail: 'reading',
  reading_inference: 'reading',
  listening: 'listening',
  듣기: 'listening',
  writing: 'writing',
  영작: 'writing',
  서술형: 'writing',
  sentence_completion: 'writing',
  communication: 'communication',
  회화: 'communication',
  대화: 'communication',
  conversation: 'communication',
};

export const ENGLISH_ABILITY_DOMAINS = {
  ACCURACY: { label: '정확성', labelEn: 'Accuracy', color: '#3B82F6' },
  UNDERSTANDING: { label: '이해력', labelEn: 'Understanding', color: '#10B981' },
  REASONING: { label: '추론력', labelEn: 'Reasoning', color: '#8B5CF6' },
  EXPRESSION: { label: '표현력', labelEn: 'Expression', color: '#F97316' },
} as const;

export const ENGLISH_ABILITY_KEYS = ['accuracy', 'understanding', 'reasoning', 'expression'] as const;

export const ENGLISH_ABILITY_DOMAIN_LABELS: Record<string, string> = {
  accuracy: '정확성',
  understanding: '이해력',
  reasoning: '추론력',
  expression: '표현력',
};

export const ENGLISH_ABILITY_DOMAIN_COLORS: Record<string, string> = {
  accuracy: ENGLISH_ABILITY_DOMAINS.ACCURACY.color,
  understanding: ENGLISH_ABILITY_DOMAINS.UNDERSTANDING.color,
  reasoning: ENGLISH_ABILITY_DOMAINS.REASONING.color,
  expression: ENGLISH_ABILITY_DOMAINS.EXPRESSION.color,
};

export const ENGLISH_TYPE_TO_DOMAIN: Record<string, string> = {
  grammar: 'accuracy',
  vocabulary: 'accuracy',
  reading: 'understanding',
  listening: 'understanding',
  writing: 'expression',
  communication: 'expression',
};

/** 프롬프트용 6유형 표. prompt-config-english 의 ENGLISH_EVALUATION_SYSTEM(내신 이원화)과 다름. */
export const ENGLISH_TYPE_TAXONOMY = `📊 **영어 평가 유형 분류:**

| 유형 | 설명 |
|------|------|
| grammar | 어법/문법 |
| vocabulary | 어휘 |
| reading | 독해 |
| listening | 듣기 (내신 지필고사는 원칙적으로 없음. 듣기 전용 문항이 명시된 경우만) |
| writing | 서술형/영작 |
| communication | 의사소통 |

**내신 분류 규칙:** 지필고사에는 원칙적으로 듣기 문항이 없다. 대화문·회화 지문은 communication 또는 reading. listening은 시험지에 듣기 전용 문항이 명시된 경우에만.`;

export const ENGLISH_QUESTION_STRATEGIES_INLINE = `📝 **영어 문항 유형별 분석 전략:**

- **어법(grammar)**: 밑줄 친 부분의 문법 요소 파악, 준동사/시제/수일치 등
- **어휘(vocabulary)**: 문맥상 의미 파악, 동의어/반의어
- **독해(reading)**: 주제, 요지, 제목, 빈칸, 순서, 삽입, 요약
- **듣기(listening)**: 내신 지필고사는 원칙적으로 없음. 듣기 전용 문항이 명시된 경우만
- **서술형(writing)**: 문장 완성, 영작, 조건 영작
- **의사소통(communication)**: 대화문·상황 표현 (듣기가 아님)`;

// ── 문항 형식 ──
export const EXAM_QUESTION_FORMATS = ['objective', 'short_answer', 'essay'] as const;
export type ExamQuestionFormat = (typeof EXAM_QUESTION_FORMATS)[number];

// ── 과목 ──
export const EXAM_SUBJECTS = {
  MATH: { label: '수학', labelEn: 'Math' },
  ENGLISH: { label: '영어', labelEn: 'English' },
} as const;

export type ExamSubjectKey = keyof typeof EXAM_SUBJECTS;

// ── 시험지 유형 ──
export const EXAM_PAPER_TYPES = ['blank', 'student'] as const;
export type ExamPaperType = (typeof EXAM_PAPER_TYPES)[number];

// ── 채점 상태 ──
export const GRADING_STATUSES = ['not_graded', 'partially_graded', 'fully_graded', 'uncertain'] as const;
export type GradingStatus = (typeof GRADING_STATUSES)[number];

// ── 에이전트 유형 ──
export const AGENT_TYPES = [
  'weakness',
  'learning',
  'prediction',
  'commentary',
  'topic-strategy',
  'exam-prep',
  'score-level-plan',
  'trends-insights',
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

// ── 에이전트별 프롬프트 버전 ──
// 각 에이전트의 프롬프트를 수정할 때 해당 버전 반드시 업데이트!
// orchestrator가 저장 시 result._meta.promptVersion으로 기록 → 버전별 품질 비교 가능
// v1.0.0 — 2026-04-15 초기 H1~H5 하드 제약 + 수식 정규화 후처리 하네스 도입
// commentary v1.1.0 — 2026-05-26 V3 리디자인 (Q&A 5문항, feature_callout, grade_cuts,
//   topic_performance, conclusion, pull_quote 등 신규 필드 — Two-pass Claude 호출 추가)
//   bump으로 기존 분석본은 페이지 진입 시 자동 V3 갱신 (lazy migration)
// commentary v1.3.0 — 2026-05-29 V3 강화 (V4 핵심 5개 콘텐츠 흡수: v4_difficulty_rows,
//   v4_main_analysis, v4_key_questions, v4_previous_comparison, v4_final_strategy를
//   V3 통합 프롬프트로 단일 생성 → 별도 V4 호출 불필요. V4 토글은 비활성화)
// commentary v1.4.0 — 2026-06-01 "이 시험만의 발견" 인사이트 바 도입. 헤드라인·feature_callout이
//   전국 상식(서술형 1/3 배점·객관식 위주 등)을 큰 글씨로 만들던 문제 → 리트머스 "옆 학원도
//   할 수 있는 말인가?" + 4각도(쏠림/시간/감점/변화). buildV3UserPrompt에 "이 시험만의 특이 신호"
//   데이터 신호 주입(서술형 배점% vs 표준, 서술형/킬러 단원 쏠림 자동 탐지, 배점 독식 단원)
// commentary v1.5.0 — 2026-06-17 문항 유형 분류 4대 영역(수와 연산/변화와 관계/도형과 측정/자료와 가능성)
//   전환에 맞춰 총평 유형 라벨·분포 서술 갱신
export const AGENT_PROMPT_VERSIONS: Record<AgentType, string> = {
  'weakness': 'v1.0.0',
  'learning': 'v1.0.0',
  'prediction': 'v1.0.0',
  'commentary': 'v1.5.0',
  'topic-strategy': 'v1.0.0',
  'exam-prep': 'v1.0.0',
  'score-level-plan': 'v1.0.0',
  'trends-insights': 'v1.0.0',
};

/**
 * V4 (학원 분석 보고서 스타일) 별도 프롬프트 버전.
 * commentary와 독립 — 사용자가 V4 토글 클릭 시 lazy 생성.
 * v1.0.0 (2026-05-27): 5섹션 구조 (exam_overview / difficulty_rows / exam_features / main_analysis / final_strategy)
 * v1.1.0 (2026-05-27): raw HTML 색상 금지 + 다음 시험 인식 (중간→기말 / 기말→다음 학년 / examCategory prompt 전달)
 * v1.2.0 (2026-05-27): 일치율 90% — 5개 신규 필드 (v4_intro / v4_academy_strategy / v4_previous_comparison / v4_key_questions / v4_difficulty_rows[].analysis_short / v4_exam_overview.expected_grade_cut) + 9섹션 재정렬 + ✏→▶ 헤딩 변경
 * v1.3.0 (2026-05-28): 특정 학원명 노출 금지 + {학원명} placeholder 도입 (tenant.name 자동 치환, 없으면 "우리 학원")
 * v1.4.0 (2026-05-28): v4_final_strategy 의미 변경 — "다음 시험 대비" → "이번 시험 출제 단원별 피드백" (다음 시험 추측 금지)
 */
export const COMMENTARY_V4_PROMPT_VERSION = 'v1.4.0';

// ── 템플릿 유형 ──
export const TEMPLATE_TYPES = ['detailed', 'summary', 'parent', 'print'] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

// ── 신뢰도 임계값 ──
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.7,
  LOW: 0.5,
} as const;

// ── 난이도 색상 (UI용, 초록→빨강 그라데이션) ──
export const DIFFICULTY_COLORS: Record<string, string> = {
  '1': '#22C55E',   // green (쉬움)
  '2': '#84CC16',   // lime
  '3': '#F59E0B',   // amber (보통)
  '4': '#F97316',   // orange
  '5': '#EF4444',   // red (어려움)
  // 구 키 호환
  concept: '#22C55E',
  pattern: '#84CC16',
  reasoning: '#F97316',
  creative: '#EF4444',
};

/** 난이도 1~5 인덱스 기반 막대 색상 (DIFFICULTY_COLORS 단일 진실의 원천) */
export const DIFFICULTY_BAR_COLORS: readonly string[] = ['1', '2', '3', '4', '5'].map(
  (k) => DIFFICULTY_COLORS[k],
);

export const DIFFICULTY_LABELS: Record<string, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  // 구 키 호환
  concept: '1',
  pattern: '2',
  reasoning: '4',
  creative: '5',
};

// ── 4대 영역 색상 (UI용) ──
export const QUESTION_TYPE_COLORS: Record<string, string> = {
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
  // 영어 (별도 체계)
  grammar: '#6366F1',
  vocabulary: '#8B5CF6',
  reading: '#EC4899',
  listening: '#14B8A6',
  writing: '#F59E0B',
  communication: '#06B6D4',
};
