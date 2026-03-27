/**
 * 기출 분석 상수 정의
 * Math Report 프로젝트에서 이식 — MathLab AI 시스템과 완전 독립
 */

// ── 4단계 난이도 ──
export const EXAM_DIFFICULTIES = {
  CONCEPT: { label: '개념', labelEn: 'Concept', level: 1 },
  PATTERN: { label: '유형', labelEn: 'Pattern', level: 2 },
  REASONING: { label: '추론', labelEn: 'Reasoning', level: 3 },
  CREATIVE: { label: '창의', labelEn: 'Creative', level: 4 },
} as const;

export type ExamDifficultyKey = keyof typeof EXAM_DIFFICULTIES;

// 3단계 (하위 호환)
export const DIFFICULTY_3LEVEL_MAP: Record<string, string> = {
  concept: 'low',
  pattern: 'medium',
  reasoning: 'high',
  creative: 'high',
};

// ── 6개 문항 유형 ──
export const EXAM_QUESTION_TYPES = {
  CALCULATION: { label: '계산', labelEn: 'Calculation' },
  GEOMETRY: { label: '도형', labelEn: 'Geometry' },
  APPLICATION: { label: '응용', labelEn: 'Application' },
  PROOF: { label: '증명', labelEn: 'Proof' },
  GRAPH: { label: '그래프', labelEn: 'Graph' },
  STATISTICS: { label: '통계', labelEn: 'Statistics' },
} as const;

export type ExamQuestionTypeKey = keyof typeof EXAM_QUESTION_TYPES;

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

// ── 템플릿 유형 ──
export const TEMPLATE_TYPES = ['detailed', 'summary', 'parent', 'print'] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

// ── 신뢰도 임계값 ──
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.7,
  LOW: 0.5,
} as const;

// ── 난이도 색상 (UI용) ──
export const DIFFICULTY_COLORS: Record<string, string> = {
  concept: '#3B82F6',   // blue
  pattern: '#10B981',   // green
  reasoning: '#F97316', // orange
  creative: '#EF4444',  // red
};

// ── 문항유형 색상 (UI용) ──
export const QUESTION_TYPE_COLORS: Record<string, string> = {
  calculation: '#6366F1',
  geometry: '#8B5CF6',
  application: '#EC4899',
  proof: '#14B8A6',
  graph: '#F59E0B',
  statistics: '#06B6D4',
};
