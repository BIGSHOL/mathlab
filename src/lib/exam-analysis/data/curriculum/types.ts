/**
 * 교육과정 전략 관련 타입 정의
 */

export interface TopicStrategy {
  keywords: string[];  // 토픽 매칭 키워드
  strategies: string[];  // 학습 전략 (최대 4개)
  tags?: string[];  // 문제 유형 태그
}

export interface GradeUnit {
  name: string;
  topics: TopicStrategy[];
}

export interface GradeCurriculum {
  grade: string;
  semester: string;
  units: GradeUnit[];
}

export interface CommonMistake {
  keywords: string[];
  mistakes: string[];
  prevention: string[];
}

export interface UnitMistakes {
  unit: string;
  mistakes: CommonMistake[];
}

export interface LevelStrategy {
  level: string;
  targetGrade: string;
  description: string;
  coreStrategies: string[];
  studyHours: string;
  recommendedBooks: string[];
  keyPrinciple: string;
}

export interface TimeStrategy {
  phase: string;
  questionRange: string;
  timeAllocation: string;
  perQuestion: string;
  tips: string[];
}

export interface EssayCheckItem {
  category: string;
  items: string[];
}

export interface StudyTimeline {
  week: number;
  theme: string;
  goals: string[];
  activities: string[];
}

export interface GradeConnection {
  fromGrade: string;
  fromTopic: string;
  toGrade: string;
  toTopics: string[];
  importance: 'critical' | 'high' | 'medium';
  warning: string;
  checkItems: string[];
}

export interface EssayTemplate {
  title: string;
  structure: string;
  example: string;
}

export interface EssayAdvancedGuide {
  category: string;
  title: string;
  templates: EssayTemplate[];
  commonMistakes: string[];
  scoringTips: string[];
}

export interface KillerPattern {
  type: string;
  description: string;
  approach: string[];
  timeEstimate: string;
}

export interface KillerQuestionType {
  grade: string;
  topic: string;
  patterns: KillerPattern[];
}

export interface RecommendedBook {
  name: string;
  publisher: string;
  level: string;
  features: string[];
  bestFor: string;
}

export interface LevelBooks {
  level: '하위권' | '중위권' | '상위권';
  description: string;
  books: RecommendedBook[];
  studyTips: string[];
}

export interface LevelRecommendation {
  level: '하위권' | '중위권' | '상위권';
  correctRate: number;
  analysis: string;
  nextSteps: string[];
}

export interface TimeAllocationGuide {
  questionType: string;
  recommendedTime: string;
  tips: string[];
}

export interface EncouragementMessages {
  level: '하위권' | '중위권' | '상위권' | '공통';
  messages: string[];
}
