import type { LearningStage } from '@/types';

export interface VisualAssets {
  topImage?: { url: string; alt?: string; caption?: string };
  inlineImages?: Array<{ position: number; url: string; alt?: string }>;
}

export interface ConceptData {
  id: string;
  title: string;
  fullContent: string;
  part: string | null;
  subject: { title: string; gradeLevel: number };
  visualAssets?: VisualAssets | null;
}

export interface BlankData {
  id: string;
  level: number;
  templateText: string;
  blanks: Array<{ position: number; answer: string; hint: string }>;
  inputMode?: 'chip' | 'typing';
}

export interface Progress {
  stage: LearningStage;
  completed: boolean;
}

export interface BlankResult {
  position: number;
  correct: boolean;
  expected?: string;
}
