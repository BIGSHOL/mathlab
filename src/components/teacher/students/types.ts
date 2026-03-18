// 학생/선생님 관리 페이지 공통 타입 정의

export interface UserItem {
  id: string;
  seq: number;
  username: string;
  name: string;
  role: string;
  grade: number | null;
  createdAt: string;
  profile: {
    totalXp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveAt: string | null;
  } | null;
}

export interface StudentStatsProfile {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt: string | null;
}

export interface StudentTestAttempt {
  id: string;
  score: number | null;
  maxScore: number | null;
  correctCount: number | null;
  totalCount: number | null;
  xpEarned: number | null;
  completedAt: string | null;
  startedAt: string;
  test: { title: string; grade: number | null };
}

export interface StudentArithmeticAttempt {
  id: string;
  category: string;
  level: number;
  correctCount: number;
  problemCount: number;
  score: number | null;
  xpEarned: number | null;
  totalTimeSeconds: number | null;
  completedAt: string | null;
  createdAt: string;
  homeworkPlanId: string | null;
  homeworkDayIndex: number | null;
}

export interface StudentLearningProgress {
  id: string;
  stage: string;
  completed: boolean;
  score: number | null;
  completedAt: string | null;
  startedAt: string;
  concept: { title: string; chapter: string | null };
}

export interface StudentTestAssignment {
  status: string;
  bestScore: number | null;
  dueDate: string | null;
  test: { title: string };
}

export interface StudentPointTransaction {
  amount: number;
  type: string;
  reason: string | null;
  createdAt: string;
}

export interface TeacherRecentTest {
  id: string;
  title: string;
  grade: number | null;
  questionCount: number;
  createdAt: string;
  _count: { attempts: number; assignments: number };
}

export interface TeacherRecentHomework {
  id: string;
  title: string;
  totalDays: number;
  dailyCount: number;
  isActive: boolean;
  createdAt: string;
  _count: { enrollments: number };
}

export interface TeacherRecentComment {
  month: string;
  content: string;
  createdAt: string;
  student: { name: string };
}

export interface HwWrongAnswer {
  problemIndex: number;
  content: string;
  selectedAnswer: string;
  correctAnswer: string;
  timeSpentSeconds: number;
}

export interface HwWrongAttempt {
  id: string;
  category: string;
  categoryLabel: string;
  level: number;
  correctCount: number;
  problemCount: number;
  totalTimeSeconds: number | null;
  completedAt: string | null;
  homeworkDayIndex: number | null;
  planTitle: string;
  wrongAnswers: HwWrongAnswer[];
}

export interface HwCategorySummary {
  category: string;
  categoryLabel: string;
  totalProblems: number;
  wrongCount: number;
  accuracy: number;
}

export interface HwWrongData {
  totalWrong: number;
  categorySummary: HwCategorySummary[];
  attempts: HwWrongAttempt[];
}

export type StudentStats = {
  type: 'student';
  profile: StudentStatsProfile | null;
  summary: {
    testCount: number;
    testAvgScore: number;
    arithmeticCount: number;
    arithmeticCorrect: number;
    arithmeticTotal: number;
    arithmeticTime: number;
    learningTotal: number;
    learningCompleted: number;
    homeworkEnrollments: number;
  };
  recentTests: StudentTestAttempt[];
  recentArithmetic: StudentArithmeticAttempt[];
  recentLearning: StudentLearningProgress[];
  recentAssignments: StudentTestAssignment[];
  recentPoints: StudentPointTransaction[];
};

export type TeacherStats = {
  type: 'teacher';
  summary: {
    testsCreated: number;
    homeworkPlans: number;
    commentsWritten: number;
    questionsGenerated: number;
  };
  recentTests: TeacherRecentTest[];
  recentHomework: TeacherRecentHomework[];
  recentComments: TeacherRecentComment[];
};

export interface ArithmeticAnswerItem {
  problemIndex: number;
  content: string;
  choices: string[];
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  comboCount: number;
  pointsEarned: number;
}
