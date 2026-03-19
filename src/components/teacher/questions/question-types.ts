import type { QuestionDifficulty, QuestionType } from '@/types';
import type { DiagramParam } from '@/types/pdf-extract';

// --- Constants ---
export const MIDDLE_BOOK_CODES = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'] as const;
export const ELEMENTARY_BOOK_CODES = ['E3-1', 'E3-2', 'E4-1', 'E4-2', 'E5-1', 'E5-2', 'E6-1', 'E6-2'] as const;
export const DIFFICULTY_OPTIONS = ['전체', '하', '중', '상', '최상'] as const;
export const TYPE_OPTIONS = ['객관식', '단답형', '서술형'] as const;
export const DOMAIN_OPTIONS = [
  { key: '전체', label: '전체' },
  { key: 'CALCULATION', label: '계산력' },
  { key: 'UNDERSTANDING', label: '이해력' },
  { key: 'PROBLEM_SOLVING', label: '문제해결력' },
  { key: 'REASONING', label: '추론력' },
] as const;
export const ITEMS_PER_PAGE = 10;

// 새 문제 추가 모달에서 사용하는 기본 단원 목록 (fallback)
export const CHAPTERS_BY_BOOK_DEFAULT: Record<string, string[]> = {
  'E3-1': ['덧셈과 뺄셈', '평면도형', '나눗셈', '곱셈', '길이와 시간', '분수와 소수'],
  'E3-2': ['곱셈', '나눗셈', '원', '분수', '들이와 무게', '자료의 정리'],
  'E4-1': ['큰 수', '각도', '곱셈과 나눗셈', '평면도형의 이동', '막대그래프', '규칙 찾기'],
  'E4-2': ['분수의 덧셈과 뺄셈', '삼각형', '소수의 덧셈과 뺄셈', '사각형', '꺾은선그래프', '다각형'],
  'E5-1': ['자연수의 혼합 계산', '약수와 배수', '규칙과 대응', '약분과 통분', '분수의 덧셈과 뺄셈', '다각형의 둘레와 넓이'],
  'E5-2': ['수의 범위와 어림', '분수의 곱셈', '합동과 대칭', '소수의 곱셈', '직육면체', '평균과 가능성'],
  'E6-1': ['분수의 나눗셈', '각기둥과 각뿔', '소수의 나눗셈', '비와 비율', '여러 가지 그래프', '직육면체의 부피와 겉넓이'],
  'E6-2': ['분수의 나눗셈', '소수의 나눗셈', '공간과 입체', '비례식과 비례배분', '원의 넓이', '원기둥 원뿔 구'],
};

export const DIFFICULTY_TO_ENUM: Record<string, QuestionDifficulty> = {
  하: 'BASIC',
  중: 'MEDIUM',
  상: 'HIGH',
  최상: 'HIGHEST',
};
export const TYPE_TO_ENUM: Record<string, QuestionType> = {
  객관식: 'MULTIPLE_CHOICE',
  단답형: 'SHORT_ANSWER',
  서술형: 'ESSAY',
};

// --- Interfaces ---
export interface QuestionItem {
  id: string;
  bookCode: string;
  chapter: string;
  section: string | null;
  questionNum: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
  sourceTag: string | null;
  domain: string | null;
  conceptId: string | null;
  diagramSpec?: DiagramParam[] | null;
}

export interface Meta {
  page: number;
  total: number;
  totalPages: number;
}

export interface EditFormState {
  content: string;
  answer: string;
  explanation: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  choices: string[];
  chapter: string;
  section: string;
  sourceTag: string;
  domain: string;
  conceptId: string;
  diagramParams: DiagramParam[];
}

export interface CreateFormState {
  bookCode: string;
  chapter: string;
  section: string;
  questionNum: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices: string[];
  answer: string;
  explanation: string;
  sourceTag: string;
  diagramParams: DiagramParam[];
}

export interface MathPopupState {
  open: boolean;
  field: 'content' | 'answer' | 'explanation' | 'choice';
  choiceIndex?: number;
  initialLatex: string;
  replaceRange?: { start: number; end: number };
}

export interface ImagePopupState {
  open: boolean;
  field: 'content' | 'explanation';
}

export interface ConceptOption {
  id: string;
  conceptCode: string;
  title: string;
}

// --- Helper functions ---
export function getDifficultyBadgeColor(d: string) {
  switch (d) {
    case '하':
      return 'bg-green-100 text-green-700';
    case '중':
      return 'bg-yellow-100 text-yellow-700';
    case '상':
      return 'bg-red-100 text-red-700';
    case '최상':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function getTopicBadgeColor(topic: string) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
  ];
  let hash = 0;
  for (let i = 0; i < topic.length; i++) hash = topic.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
