/**
 * 학습 대책 탭 타입 정의
 * Math Report study-strategy/types.ts에서 이식
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

export interface StrategyExportOptions {
  showTopicAnalysis: boolean;
  showLearningStrategies: boolean;
  showEssay: boolean;
  showTimeAllocation: boolean;
  showMistakes: boolean;
  showConnections: boolean;
  showKiller: boolean;
  showLevelStrategies: boolean;
  showTimeline: boolean;
  showPersonalized?: boolean;
}

export interface StudyStrategyTabProps {
  questions: AnalyzedQuestion[];
  grade?: string;
}

export interface TopicSummary {
  topic: string;
  shortTopic: string;
  questionCount: number;
  totalPoints: number;
  percentage: number;
  difficulties: string[];
  types: string[];
  essayCount: number;
  essayNumbers: number[];
  avgDifficulty: number;
  features: string[];
  questionNumbers: number[];
}

export interface ChapterGroup {
  chapterName: string;
  topics: TopicSummary[];
  questionCount: number;
  totalPoints: number;
  percentage: number;
  essayCount: number;
  essayNumbers: number[];
  avgDifficulty: number;
  features: string[];
}

export interface WrongAnswerSummary {
  topic: string;
  shortTopic: string;
  questionNumbers: number[];
  totalPoints: number;
  lostPoints: number;
  errorTypes: string[];
  difficulty: string[];
}

export interface ErrorTypeSummary {
  errorType: string;
  count: number;
  questionNumbers: number[];
  totalLostPoints: number;
}

export type SectionId =
  | 'topicAnalysis'
  | 'learningStrategies'
  | 'essay'
  | 'timeAllocation'
  | 'mistakes'
  | 'connections'
  | 'killer'
  | 'levelStrategies'
  | 'timeline'
  | 'personalized';
