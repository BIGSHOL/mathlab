export type UserRole = 'STUDENT' | 'TEACHER' | 'OWNER' | 'SUPER_ADMIN';

export type LearningStage = 'READING' | 'BLANK_EASY' | 'BLANK_HARD' | 'BLANK_FULL' | 'BLANK_PAGE';

export type PointType = 'EARN' | 'SPEND';

export type PointReason =
  | 'READING_COMPLETE'
  | 'BLANK_EASY'
  | 'BLANK_HARD'
  | 'BLANK_FULL'
  | 'BLANK_PAGE'
  | 'BONUS';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  grade: number | null;
  profileImage: string | null;
  tenantId: string | null;
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
  domain: string | null;
  conceptId: string | null;
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

// FEAT-3: Test Assignment
export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface TestAssignment {
  testId: string;
  dueDate: string | null;
  status: AssignmentStatus;
  bestScore: number | null;
  allowLateSubmission: boolean;
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  ASSIGNED: '배정됨',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  OVERDUE: '기한초과',
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

// FEAT: Level Test
export type LevelTestDomain = 'CALCULATION' | 'UNDERSTANDING' | 'PROBLEM_SOLVING' | 'REASONING';

export const DOMAIN_LABELS: Record<LevelTestDomain, string> = {
  CALCULATION: '계산력',
  UNDERSTANDING: '이해력',
  PROBLEM_SOLVING: '문제해결력',
  REASONING: '추론력',
};

export const DOMAIN_COLORS: Record<LevelTestDomain, { bg: string; text: string }> = {
  CALCULATION: { bg: 'bg-blue-100', text: 'text-blue-700' },
  UNDERSTANDING: { bg: 'bg-green-100', text: 'text-green-700' },
  PROBLEM_SOLVING: { bg: 'bg-orange-100', text: 'text-orange-700' },
  REASONING: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  '1등급': { bg: 'bg-violet-100', text: 'text-violet-700' },
  '2등급': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  '3등급': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '4등급': { bg: 'bg-sky-100', text: 'text-sky-700' },
  '5등급': { bg: 'bg-green-100', text: 'text-green-700' },
  '6등급': { bg: 'bg-lime-100', text: 'text-lime-700' },
  '7등급': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  '8등급': { bg: 'bg-orange-100', text: 'text-orange-700' },
  '9등급': { bg: 'bg-red-100', text: 'text-red-700' },
  // 하위호환
  '심화': { bg: 'bg-violet-100', text: 'text-violet-700' },
  '상': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '중': { bg: 'bg-green-100', text: 'text-green-700' },
  '기초': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  '기초보충': { bg: 'bg-red-100', text: 'text-red-700' },
};
