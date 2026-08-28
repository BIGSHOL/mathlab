/**
 * 기출 분석 공통 상수 — 과목 무관(난이도 스케일·문항 형식·채점 상태·에이전트·템플릿·색상).
 * 2026-08 과목 분리: 옛 constants.ts 에서 행 단위로 잘라냈다. **값은 한 글자도 바꾸지 않았다.**
 *
 * 과목별 정의는 `../math/constants` · `../english/constants` 에 있다.
 * 여기 있어도 되는 것은 "수학이든 영어든 같은 값" 뿐 — 분기가 필요하면 과목 파일로 내려보낼 것.
 */
import { MATH_QUESTION_TYPE_COLORS, PROMPT_VERSION } from '../math/constants';
import { ENGLISH_PROMPT_VERSION, ENGLISH_QUESTION_TYPE_COLORS } from '../english/constants';

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
  'commentary': 'v1.6.0',
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

// ── 문항 유형 색상 (UI용) — 과목별 표를 합친 조회용 맵 ──
// 차트/범례가 과목을 모르고 키로만 조회하는 자리가 있어 병합본을 유지한다(키 순서도 원본 그대로).
export const QUESTION_TYPE_COLORS: Record<string, string> = {
  ...MATH_QUESTION_TYPE_COLORS,
  ...ENGLISH_QUESTION_TYPE_COLORS,
};
