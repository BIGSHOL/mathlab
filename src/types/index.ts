export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type LearningStage = 'READING' | 'BLANK_EASY' | 'BLANK_HARD' | 'BLANK_PAGE';

export type PointType = 'EARN' | 'SPEND';

export type PointReason =
  | 'READING_COMPLETE'
  | 'BLANK_EASY'
  | 'BLANK_HARD'
  | 'BLANK_PAGE'
  | 'BONUS';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  grade: number | null;
  profileImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  title: string;
  description: string | null;
  gradeLevel: number;
  sortOrder: number;
}

export interface Concept {
  id: string;
  subjectId: string;
  title: string;
  fullContent: string;
  visualAssets: Record<string, unknown> | null;
  sortOrder: number;
}

export interface BlankExercise {
  id: string;
  conceptId: string;
  level: number;
  blanks: BlankItem[];
  templateText: string;
}

export interface BlankItem {
  position: number;
  answer: string;
  hint: string;
}

export interface LearningProgress {
  id: string;
  userId: string;
  conceptId: string;
  stage: LearningStage;
  completed: boolean;
  attempts: number;
  score: number | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: PointType;
  reason: PointReason;
  referenceId: string | null;
  createdAt: Date;
}

export interface StudentProfile {
  id: string;
  userId: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt: Date | null;
}

// FEAT-2: Question Bank
export type QuestionDifficulty = 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
export type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY';

export interface Question {
  id: string;
  bookCode: string;
  chapter: string;
  section: string | null;
  questionNum: number;
  pageNum: number | null;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
  sourceTag: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  BASIC: '하',
  MEDIUM: '중',
  HIGH: '상',
  HIGHEST: '최상',
};

export const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: '객관식',
  SHORT_ANSWER: '단답형',
  ESSAY: '서술형',
};

export const BOOK_LABELS: Record<string, string> = {
  '1-1': '중1-1',
  '1-2': '중1-2',
  '2-1': '중2-1',
  '2-2': '중2-2',
  '3-1': '중3-1',
  '3-2': '중3-2',
  'E3-1': '초3-1',
  'E3-2': '초3-2',
  'E4-1': '초4-1',
  'E4-2': '초4-2',
  'E5-1': '초5-1',
  'E5-2': '초5-2',
  'E6-1': '초6-1',
  'E6-2': '초6-2',
};

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    total?: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
