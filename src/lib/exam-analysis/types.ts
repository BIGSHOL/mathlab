/**
 * 기출 분석 타입 정의
 * Python Pydantic 모델에서 1:1 이식
 */

import type { ExamDifficultyKey, ExamQuestionTypeKey, ExamQuestionFormat, GradingStatus, AgentType } from './constants';

// ── 문항 분석 결과 (기본 분석) ──
export interface AnalyzedQuestion {
  id?: string;
  question_number: number | string;
  question_format: ExamQuestionFormat | null;
  difficulty: Lowercase<ExamDifficultyKey>;
  difficulty_reason: string | null;
  question_type: Lowercase<ExamQuestionTypeKey>;
  points: number | null;
  topic: string | null;             // "과목 > 대단원 > 소단원"
  ai_comment: string | null;       // 2문장, 최대 50자
  confidence: number;              // 0.0-1.0
  confidence_reason: string | null;
  // 학생 답안지 전용
  is_correct: boolean | null;
  student_answer: string | null;
  earned_points: number | null;
  error_type: string | null;
  created_at?: string;
}

// ── 난이도 분포 ──
export interface DifficultyDistribution {
  concept: number;
  pattern: number;
  reasoning: number;
  creative: number;
  // 3단계 하위 호환
  high: number;
  medium: number;
  low: number;
}

// ── 유형 분포 ──
export interface TypeDistribution {
  calculation: number;
  geometry: number;
  application: number;
  proof: number;
  graph: number;
  statistics: number;
}

// ── 분석 요약 ──
export interface AnalysisSummary {
  difficulty_distribution: DifficultyDistribution;
  type_distribution: TypeDistribution;
  average_difficulty: string;
  dominant_type: string;
}

// ── 시험지 정보 ──
export interface ExamInfo {
  total_questions: number;
  total_points: number;
  format_distribution: {
    objective: number;
    short_answer: number;
    essay: number;
  };
}

// ── 기본 분석 결과 ──
export interface BasicAnalysisResult {
  exam_info: ExamInfo;
  summary: AnalysisSummary;
  questions: AnalyzedQuestion[];
}

// ── 채점 마크 감지 ──
export interface GradingMark {
  question_number: number;
  mark_type: string;       // circle, slash, x, check, triangle
  mark_symbol: string;
  position: string;
  color: string;
  indicates: 'correct' | 'incorrect' | 'not_graded' | 'uncertain';
  confidence: number;
}

export interface MarkDetectionResult {
  marks: GradingMark[];
  overall_grading_status: GradingStatus;
  color_distinction_possible: boolean;
  detection_notes: string[];
}

// ── 시험지 분류 ──
export interface ExamPaperClassification {
  paper_type: 'blank' | 'answered' | 'mixed';
  paper_type_confidence: number;
  grading_status: GradingStatus;
  grading_confidence: number;
  extracted_metadata: {
    school_name: string | null;
    exam_title: string | null;
    grade: string | null;
    date: string | null;
    subject: string | null;
    suggested_title: string | null;
  };
}

// ── 교차 검증 결과 ──
export interface CrossValidationResult {
  corrections_made: number;
  confidence_boosts: number;
  null_conversions: number;
  details: Array<{
    question_number: number;
    action: 'corrected' | 'boosted' | 'nulled';
    reason: string;
  }>;
}

// ══════════════════════════════════════════
// 확장 분석 에이전트 결과 타입
// ══════════════════════════════════════════

// ── 취약점 분석 (WeaknessAgent) ──
export interface SeverityInfo {
  count: number;
  percentage: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface TopicWeakness {
  topic: string;
  wrong_count: number;
  total_count: number;
  severity_score: number;
  recommendation: string;
}

export interface MistakePattern {
  pattern_type: 'calculation_error' | 'concept_gap' | 'careless' | 'time_pressure';
  frequency: number;
  description: string;
  example_questions: (number | string)[];
}

export interface CognitiveLevel {
  achieved: number;
  target: number;
  gap_reason?: string;
}

export interface WeaknessProfile {
  difficulty_weakness: Record<string, SeverityInfo>;
  type_weakness: Record<string, SeverityInfo>;
  topic_weaknesses: TopicWeakness[];
  mistake_patterns: MistakePattern[];
  cognitive_levels: {
    knowledge: CognitiveLevel;
    comprehension: CognitiveLevel;
    application: CognitiveLevel;
    analysis: CognitiveLevel;
  };
}

// ── 학습 계획 (LearningAgent) ──
export interface LearningTopic {
  topic: string;
  duration_hours: number;
  resources: string[];
  checkpoint: string;
}

export interface LearningPhase {
  phase_number: number;
  title: string;
  duration: string;
  topics: LearningTopic[];
}

export interface DailySchedule {
  day: string;
  topics: string[];
  duration_minutes: number;
  activities: string[];
}

export interface ScoreImprovement {
  current_estimated_score: number;
  target_score: number;
  improvement_points: number;
  achievement_confidence: number;
}

export interface LearningPlan {
  duration: string;
  weekly_hours: number;
  phases: LearningPhase[];
  daily_schedule: DailySchedule[];
  expected_improvement: ScoreImprovement;
}

// ── 성적 예측 (PredictionAgent) ──
export interface DifficultyHandling {
  success_rate: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface TrajectoryPoint {
  timeframe: string;
  predicted_score: number;
  confidence_interval: [number, number];
  required_effort: string;
}

export interface GoalAchievement {
  goal: string;
  current_probability: number;
  with_current_plan: number;
  with_optimized_plan: number;
}

export interface RiskFactor {
  factor: string;
  impact_on_goal: 'critical' | 'high' | 'medium' | 'low';
  mitigation: string;
}

export interface PerformancePrediction {
  current_assessment: {
    score_estimate: number;
    rank_estimate_percentile: number;
    difficulty_handling: Record<string, DifficultyHandling>;
  };
  trajectory: TrajectoryPoint[];
  goal_achievement: GoalAchievement;
  risk_factors: RiskFactor[];
}

// ── 에이전트 공통 ──
export interface AgentContext {
  basicResult: BasicAnalysisResult;
  subject: string;
  grade: string;
  weaknessProfile?: WeaknessProfile;
  learningPlan?: LearningPlan;
}

export interface AgentResult {
  agentType: AgentType;
  result: unknown;
  creditsUsed: number;
}

// ── 프롬프트 빌더 ──
export interface ExamContext {
  subject: string;
  grade_level: string | null;
  unit: string | null;
  category: string | null;
  exam_scope: string[] | null;
  paper_type: string;
  has_essay: boolean;
}

export interface BuildPromptRequest {
  exam_context: ExamContext;
  include_error_patterns: boolean;
  include_examples: boolean;
  max_examples_per_pattern: number;
}

export interface BuildPromptResponse {
  base_prompt: string;
  analysis_guidelines: string;
  error_patterns_prompt: string | null;
  examples_prompt: string | null;
  combined_prompt: string;
  used_templates: string[];
  matched_problem_types: string[];
}
