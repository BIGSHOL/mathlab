// Shared types for Concepts page components

export interface AiMetadataSuggestion {
  field: string;
  label: string;
  currentDisplay: string;
  suggestedDisplay: string;
  suggestedRaw: string | number;
  checked: boolean;
}

export interface PrerequisiteItem {
  id: string;
  conceptCode: string;
  title: string;
}

export interface SubjectItem {
  id: string;
  title: string;
  gradeLevel: number;
}

export interface ConceptItem {
  id: string;
  subjectId: string;
  conceptCode: string;
  title: string;
  fullContent: string;
  grade: string;
  semester: number | null;
  chapter: string | null;
  section: string | null;
  sectionSub: string | null;
  category: string;
  part: string;
  source: string | null;
  keywords: string | null;
  prerequisites: PrerequisiteItem[];
  subConcepts: PrerequisiteItem[];
}

export interface Meta {
  page: number;
  total: number;
  totalPages: number;
}

import type { BlankDifficulty } from '@/lib/utils/blank-generator';
export type { BlankDifficulty };

export interface BlankChild {
  position: number;
  answer: string;
  hint: string;
  offset: number;
  length: number;
}

export interface BlankItem {
  position: number;
  answer: string;
  hint: string;
  difficulty: BlankDifficulty;
  children?: BlankChild[];
}

export interface BlankExercise {
  id: string;
  conceptId: string;
  level: number;
  templateText: string;
  blanks: BlankItem[];
}

export interface BlankFormState {
  level: number;
  templateText: string;
  blanks: BlankItem[];
}

export interface EditFormState {
  subjectId: string;
  title: string;
  fullContent: string;
  conceptCode: string;
  grade: string;
  semester: string | number;
  chapter: string;
  section: string;
  sectionSub: string;
  category: string;
  part: string;
  source: string;
  keywords: string;
}

// Constants
export const ITEMS_PER_PAGE = 25;

export const DIFFICULTY_CYCLE: BlankDifficulty[] = ['easy', 'hard', 'full'];
export const DIFFICULTY_LABELS: Record<string, string> = { easy: '1단계', hard: '2단계', full: '통문장', both: '전체' };
export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700',
  hard: 'bg-amber-100 text-amber-700',
  full: 'bg-rose-100 text-rose-700',
  both: 'bg-blue-100 text-blue-700',
};
