export enum SchoolLevel {
  ELEMENTARY = '초등학교',
  MIDDLE = '중학교',
  HIGH = '고등학교',
}

export enum Difficulty {
  LOW = '하',
  MEDIUM = '중',
  HIGH = '상',
  EXTREME = '최상',
}

export enum ProblemType {
  CONCEPT = '개념 확인',
  TYPE = '유형 익히기',
  SKILL = '실력 다지기',
  CREATIVE = '창의 융합',
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
}

export type GenerationMode = 'curriculum' | 'image';

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
}
