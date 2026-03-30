/**
 * 영어 교육과정 전략 관련 타입 정의
 *
 * 수학과 공통된 타입은 curriculum/types.ts에서 재사용합니다.
 */

// 공통 타입 재사용
export type {
  TopicStrategy,
  GradeUnit,
  GradeCurriculum,
  CommonMistake,
  UnitMistakes,
  LevelStrategy,
  TimeStrategy,
  GradeConnection,
  KillerPattern,
  KillerQuestionType,
  RecommendedBook,
  LevelBooks,
  LevelRecommendation,
  EncouragementMessages,
} from '../curriculum/types';

/**
 * 영어 문제 유형
 */
export type EnglishQuestionType =
  | 'vocabulary'       // 어휘
  | 'grammar'          // 문법
  | 'reading_main_idea' // 대의파악
  | 'reading_detail'   // 세부정보
  | 'reading_inference' // 추론
  | 'listening'        // 듣기
  | 'writing'          // 영작
  | 'sentence_completion' // 문장완성
  | 'conversation'     // 대화문
  | 'other';           // 기타

/**
 * 영어 오류 유형
 */
export type EnglishErrorType =
  | 'tense_error'       // 시제오류
  | 'word_order_error'  // 어순오류
  | 'vocabulary_error'  // 어휘오류
  | 'comprehension_error' // 독해오류
  | 'listening_error'   // 청취오류
  | 'careless_mistake'; // 단순실수

/**
 * 영어 문법 단원
 */
export interface GrammarUnit {
  name: string;
  grade: string;
  topics: string[];
  keyPatterns: string[];
  commonErrors: string[];
}

/**
 * 영어 독해 전략
 */
export interface ReadingStrategy {
  type: 'main_idea' | 'detail' | 'inference' | 'vocabulary' | 'structure';
  name: string;
  steps: string[];
  timeAllocation: string;
  tips: string[];
}

/**
 * 영어 어휘 레벨
 */
export interface VocabularyLevel {
  grade: string;
  wordCount: string;
  keyCategories: string[];
  studyTips: string[];
}

/**
 * 영어 수능형 문제 유형
 */
export interface CSATQuestionType {
  number: string;       // 문항 번호 범위 (예: "20-24")
  type: string;         // 문제 유형 (예: "빈칸 추론")
  difficulty: 'easy' | 'medium' | 'hard' | 'killer';
  timeAllocation: string;
  strategies: string[];
  commonTraps: string[];
}

/**
 * 영어 서술형 가이드 (영작문)
 */
export interface WritingGuide {
  type: 'sentence' | 'paragraph' | 'essay';
  name: string;
  structure: string[];
  scoringCriteria: string[];
  commonMistakes: string[];
  examples: {
    prompt: string;
    goodAnswer: string;
    badAnswer: string;
    feedback: string;
  }[];
}

/**
 * 영어 시험 유형별 전략
 */
export interface ExamTypeStrategy {
  examType: 'midterm' | 'final' | 'mock' | 'csat';
  questionDistribution: {
    type: string;
    count: number;
    points: number;
  }[];
  timeManagement: string[];
  priorityOrder: string[];
}
