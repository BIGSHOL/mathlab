import type { LevelTestDomain } from '@/types';

// === 보고서 공통 타입 ===

export interface ReportAreaInfo {
  chapter: string;
  accuracy: number;
  total: number;
  correct: number;
}

export interface ReportPrerequisiteWeakness {
  conceptCode: string;
  conceptTitle: string;
  relatedChapter: string;
  accuracy: number;
}

export interface ReportPrereqChain {
  wrongConcept: { code: string; title: string; chapter: string };
  prerequisites: { code: string; title: string; chapter: string; depth: number }[];
}

// === 레벨테스트 보고서 API 응답 ===

export interface LevelTestReportData {
  test: {
    id: string;
    seq: number;
    title: string;
    grade: number;
    questionCount: number;
    timeLimitMin: number | null;
    createdAt: string;
  };
  student: {
    id: string;
    name: string;
    grade: number | null;
  };
  attempt: {
    id: string;
    completedAt: string | null;
    score: number;
    maxScore: number;
    correctCount: number;
    totalCount: number;
    entryMethod: string;
  };
  diagnostic: {
    recommendLevel: string;
    overallAccuracy: number;
    domainScores: Record<LevelTestDomain, { total: number; correct: number; accuracy: number }>;
    weakAreas: ReportAreaInfo[];
    strongAreas: ReportAreaInfo[];
    prerequisiteWeaknesses: ReportPrerequisiteWeakness[];
    prerequisiteChains: ReportPrereqChain[];
  };
  questions: ReportQuestion[];
  answers: ReportAnswer[];
  academy: { name: string };
  comments: {
    difficultyComment: string;
    chapterComment: string;
  };
  aiContent: {
    totalReview: string | null;
    analysisGuide: string | null;
  };
}

export interface ReportQuestion {
  id: string;
  chapter: string;
  section: string | null;
  difficulty: string;
  domain: string | null;
  answer: string;
  questionNum: number;
}

export interface ReportAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  statusClassification: string | null;
}
