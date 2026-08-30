/**
 * 학습 대책 탭 타입 정의
 * Math Report study-strategy/types.ts에서 이식
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { QuestionEvidence } from '@/lib/exam-analysis/shared/question-evidence';

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
  /**
   * 이 단원 문항 중 AI 소견이 붙어 있는 것들 — 정적 조언 옆에 놓을 **이 시험의 근거**.
   * 근거가 없는 분석본(구버전·저신뢰)에서는 빈 배열이고, 그때 화면은 블록을 숨긴다.
   * optional 로 두면 새 구성 지점에서 조용히 빠지므로 **필수**로 둔다.
   */
  evidence: QuestionEvidence[];
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
  | 'ability'
  | 'learningStrategies'
  | 'essay'
  | 'timeAllocation'
  | 'mistakes'
  | 'connections'
  | 'killer'
  | 'levelStrategies'
  | 'timeline'
  | 'personalized';
