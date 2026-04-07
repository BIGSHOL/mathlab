export enum SchoolLevel {
  ELEMENTARY = '초등학교',
  MIDDLE = '중학교',
  HIGH = '고등학교',
}

export enum Difficulty {
  LEVEL1 = 'Level 1',
  LEVEL2 = 'Level 2',
  LEVEL3 = 'Level 3',
  LEVEL4 = 'Level 4',
  LEVEL5 = 'Level 5',
}

export enum ProblemType {
  CALCULATION = '계산력',
  UNDERSTANDING = '이해력',
  PROBLEM_SOLVING = '문제해결력',
  REASONING = '추론력',
}

export enum AnswerType {
  MULTIPLE_CHOICE = '객관식 (5지선다)',
  SUBJECTIVE = '주관식/서술형',
}

export interface CurriculumUnit {
  name: string;
  subUnits?: CurriculumUnit[];
}

import { DiagramSpec } from './diagram';

export interface GeneratedProblem {
  question: string;
  choices?: string[];
  answer: string;
  solution: string;
  topic: string;
  difficulty: string;
  diagramSVG?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diagramSpec?: DiagramSpec | any | null;
  /** exact 모드에서 원본 업로드 이미지 (base64 data URL) */
  sourceImage?: string | null;
}

export type GenerationMode = 'curriculum' | 'image' | 'exact';

export interface SelectionState {
  mode: GenerationMode;
  sourceImage?: string | null;
  schoolLevel: SchoolLevel;
  grade: string;
  mainUnit: string;
  subUnit: string;
  detailUnit: string;
  difficulty: Difficulty;
  problemType: ProblemType;
  answerType: AnswerType;
  removeScore?: boolean;
  /** 교과서 ID (textbook-curriculum.ts 기준, 예: 'mirae-m1') */
  textbookId?: string;
}
