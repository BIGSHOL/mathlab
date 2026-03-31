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

// ── 수학 능력 영역 (MathLab 기존 4대 영역과 동일) ──
export const ABILITY_DOMAINS = {
  CALCULATION: { label: '계산력', labelEn: 'Calculation', color: '#3B82F6' },
  UNDERSTANDING: { label: '이해력', labelEn: 'Understanding', color: '#10B981' },
  PROBLEM_SOLVING: { label: '문제해결력', labelEn: 'Problem Solving', color: '#F97316' },
  REASONING: { label: '추론력', labelEn: 'Reasoning', color: '#8B5CF6' },
} as const;

export type AbilityDomainKey = keyof typeof ABILITY_DOMAINS;

// ── question_type → ability_domain 매핑 ──
export const TYPE_TO_DOMAIN: Record<string, string> = {
  calculation: 'calculation',
  algebra: 'calculation',
  equation: 'calculation',
  inequality: 'calculation',
  number: 'calculation',
  geometry: 'understanding',
  graph: 'understanding',
  set: 'understanding',
  function: 'understanding',
  application: 'problem_solving',
  problem_solving: 'problem_solving',
  statistics: 'problem_solving',
  probability: 'problem_solving',
  proof: 'reasoning',
  sequence: 'reasoning',
  trigonometry: 'reasoning',
  calculus: 'reasoning',
  vector: 'reasoning',
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
  // Gemini 반환 변형
  algebra: '#7C3AED',
  problem_solving: '#E11D48',
  number: '#0EA5E9',
  function: '#D97706',
  probability: '#059669',
  equation: '#6366F1',
  inequality: '#9333EA',
  sequence: '#0891B2',
  trigonometry: '#DB2777',
  calculus: '#DC2626',
  vector: '#4F46E5',
  set: '#7C3AED',
  // 영어
  grammar: '#6366F1',
  vocabulary: '#8B5CF6',
  reading: '#EC4899',
  listening: '#14B8A6',
  writing: '#F59E0B',
  communication: '#06B6D4',
};
