import { create } from 'zustand';

interface AnswerEntry {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  isOverridden: boolean;
  correctAnswer: string;
}

interface TestInfo {
  id: string;
  seq: number;
  title: string;
  testType: string;
  grade: number;
  questionCount: number;
}

interface StudentInfo {
  id: string;
  name: string;
  username: string;
  grade: number | null;
}

interface QuestionInfo {
  id: string;
  content: string;
  choices: unknown;
  answer: string;
  explanation: string | null;
  difficulty: string;
  type: string;
  chapter: string | null;
  domain: string | null;
}

interface ManualGradingState {
  // 선택 상태
  selectedTest: TestInfo | null;
  selectedStudent: StudentInfo | null;

  // 채점 진행
  attemptId: string | null;
  questions: QuestionInfo[];
  answers: Map<string, AnswerEntry>;
  activeQuestionId: string | null;
  totalTimeMinutes: number;

  // UI 상태
  saving: boolean;
  completed: boolean;
  completionResult: {
    score: number;
    maxScore: number;
    correctCount: number;
    totalCount: number;
    xpEarned: number;
    isLevelTest: boolean;
  } | null;

  // 액션
  setTest: (test: TestInfo | null) => void;
  setStudent: (student: StudentInfo | null) => void;
  setAttemptId: (id: string | null) => void;
  setQuestions: (questions: QuestionInfo[]) => void;
  setAnswer: (questionId: string, entry: AnswerEntry) => void;
  removeAnswer: (questionId: string) => void;
  setAllAnswers: (entries: AnswerEntry[]) => void;
  clearAllAnswers: () => void;
  setActiveQuestionId: (id: string | null) => void;
  setTotalTimeMinutes: (minutes: number) => void;
  setSaving: (saving: boolean) => void;
  setCompleted: (completed: boolean, result?: ManualGradingState['completionResult']) => void;
  reset: () => void;
}

export const useManualGradingStore = create<ManualGradingState>((set) => ({
  selectedTest: null,
  selectedStudent: null,
  attemptId: null,
  questions: [],
  answers: new Map(),
  activeQuestionId: null,
  totalTimeMinutes: 30,
  saving: false,
  completed: false,
  completionResult: null,

  setTest: (test) => set({ selectedTest: test }),
  setStudent: (student) => set({ selectedStudent: student }),
  setAttemptId: (id) => set({ attemptId: id }),
  setQuestions: (questions) => set({ questions }),

  setAnswer: (questionId, entry) =>
    set((state) => {
      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, entry);
      return { answers: newAnswers };
    }),

  removeAnswer: (questionId) =>
    set((state) => {
      const newAnswers = new Map(state.answers);
      newAnswers.delete(questionId);
      return { answers: newAnswers };
    }),

  setAllAnswers: (entries) =>
    set(() => {
      const newAnswers = new Map<string, AnswerEntry>();
      for (const entry of entries) {
        newAnswers.set(entry.questionId, entry);
      }
      return { answers: newAnswers };
    }),

  clearAllAnswers: () => set({ answers: new Map() }),

  setActiveQuestionId: (id) => set({ activeQuestionId: id }),
  setTotalTimeMinutes: (minutes) => set({ totalTimeMinutes: minutes }),
  setSaving: (saving) => set({ saving }),

  setCompleted: (completed, result) =>
    set({ completed, completionResult: result ?? null }),

  reset: () =>
    set({
      selectedTest: null,
      selectedStudent: null,
      attemptId: null,
      questions: [],
      answers: new Map(),
      activeQuestionId: null,
      totalTimeMinutes: 30,
      saving: false,
      completed: false,
      completionResult: null,
    }),
}));
