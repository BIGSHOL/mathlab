import type { ApiResponse } from './types';

type Stage = 'READING' | 'BLANK_EASY' | 'BLANK_HARD' | 'BLANK_PAGE';

/** GET /api/learning/progress?conceptId=xxx */
export type ProgressResponse = ApiResponse<
  Array<{
    id: string;
    conceptId: string;
    stage: Stage;
    completed: boolean;
    attempts: number;
    score: number | null;
    startedAt: string;
    completedAt: string | null;
  }>
>;

/** POST /api/learning/progress */
export interface CompleteStageRequest {
  conceptId: string;
  stage: Stage;
}

export type CompleteStageResponse = ApiResponse<{
  id: string;
  stage: Stage;
  completed: boolean;
  xpAwarded: number;
}>;

/** POST /api/learning/blank-submit */
export interface BlankSubmitRequest {
  exerciseId: string;
  answers: Array<{
    position: number;
    value: string;
  }>;
}

export type BlankSubmitResponse = ApiResponse<{
  correct: boolean;
  results: Array<{
    position: number;
    correct: boolean;
    expected: string;
    submitted: string;
  }>;
  allCorrect: boolean;
  xpAwarded: number;
}>;

/** POST /api/learning/blank-page-submit */
export interface BlankPageSubmitRequest {
  conceptId: string;
  content: string;
}

export type BlankPageSubmitResponse = ApiResponse<{
  score: number;
  passed: boolean;
  feedback: string;
  xpAwarded: number;
}>;
