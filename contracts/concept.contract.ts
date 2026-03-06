import type { ApiResponse } from './types';

/** GET /api/concepts?subjectId=xxx */
export type ConceptsListResponse = ApiResponse<
  Array<{
    id: string;
    subjectId: string;
    title: string;
    sortOrder: number;
    subject: { title: string; gradeLevel: number };
  }>
>;

/** GET /api/concepts/:id */
export type ConceptDetailResponse = ApiResponse<{
  id: string;
  subjectId: string;
  title: string;
  fullContent: string;
  visualAssets: Record<string, unknown> | null;
  sortOrder: number;
  subject: { title: string; gradeLevel: number };
}>;

/** GET /api/concepts/:id/blanks?level=1 */
export type BlankExerciseResponse = ApiResponse<{
  id: string;
  conceptId: string;
  level: number;
  blanks: Array<{
    position: number;
    answer: string;
    hint: string;
  }>;
  templateText: string;
}>;
