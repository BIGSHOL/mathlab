import { create } from 'zustand';
import type { EditorQuestion } from '@/components/level-test-editor/right-panel/QuestionCard';
import type { LevelTestDomain } from '@/types';

export type WizardMode = 'test' | 'level_test' | 'worksheet';
export type SchoolLevel = 'elementary' | 'middle' | 'high';

// 학교급별 bookCode 목록
export const BOOK_CODES_BY_LEVEL: Record<SchoolLevel, string[]> = {
  elementary: ['E3-1', 'E3-2', 'E4-1', 'E4-2', 'E5-1', 'E5-2', 'E6-1', 'E6-2'],
  middle: ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'],
  high: [], // 추후 확장
};

export const BOOK_CODE_LABELS: Record<string, string> = {
  'E3-1': '3-1', 'E3-2': '3-2',
  'E4-1': '4-1', 'E4-2': '4-2',
  'E5-1': '5-1', 'E5-2': '5-2',
  'E6-1': '6-1', 'E6-2': '6-2',
  '1-1': '1-1', '1-2': '1-2',
  '2-1': '2-1', '2-2': '2-2',
  '3-1': '3-1', '3-2': '3-2',
};

interface WizardState {
  // 모드 & 스텝
  mode: WizardMode;
  currentStep: 1 | 2 | 3;

  // STEP 1: 범위 선택
  schoolLevel: SchoolLevel;
  selectedBookCodes: string[];
  checkedChapters: string[];   // 'bookCode|chapter' 형식
  checkedSections: string[];   // 'bookCode|chapter|section' 형식
  questionCount: number;
  difficultyFilter: string[];  // 빈 배열 = 전체
  typeFilter: string[];        // 빈 배열 = 전체

  // STEP 2: 문제 편집
  questions: EditorQuestion[];
  questionDomains: Record<string, LevelTestDomain>;

  // STEP 3: 설정
  title: string;
  grade: number;
  testType: string;
  timeLimitMin: number | null;
  shuffleOptions: boolean;
  maxAttempts: number | null;
  spacing: number; // 문항 간 여백 (px 단위)
  columns: 1 | 2;
  showTypeName: boolean;
  // Print options
  template: 'default' | 'exam' | 'large' | 'minimal' | 'csat' | 'classic' | 'notebook' | 'formal' | 'bubble';
  color: string;
  showAnswerKey: boolean;
  quickAnswerOnly: boolean;
  showDate: boolean;
  showChapter: boolean;
  showDifficulty: boolean;
  showDivider: boolean;
  tags: string[];

  // 상태 플래그
  isDirty: boolean;

  // 액션
  setMode: (mode: WizardMode) => void;
  setStep: (step: 1 | 2 | 3) => void;
  setSchoolLevel: (level: SchoolLevel) => void;
  toggleBookCode: (code: string) => void;
  setSelectedBookCodes: (codes: string[]) => void;
  setCheckedChapters: (chapters: string[]) => void;
  setCheckedSections: (sections: string[]) => void;
  setQuestionCount: (count: number) => void;
  setDifficultyFilter: (filter: string[]) => void;
  setTypeFilter: (filter: string[]) => void;
  setQuestions: (questions: EditorQuestion[]) => void;
  addQuestion: (question: EditorQuestion, domain?: LevelTestDomain) => void;
  removeQuestion: (id: string) => void;
  replaceQuestion: (oldId: string, newQuestion: EditorQuestion, domain?: LevelTestDomain) => void;
  reorderQuestion: (fromIndex: number, toIndex: number) => void;
  sortQuestions: (criteria: Array<{ key: string; direction: 'asc' | 'desc' }>) => void;
  setQuestionDomain: (id: string, domain: LevelTestDomain) => void;
  setQuestionDomains: (domains: Record<string, LevelTestDomain>) => void;
  setTitle: (title: string) => void;
  setGrade: (grade: number) => void;
  setTestType: (type: string) => void;
  setTimeLimitMin: (min: number | null) => void;
  setShuffleOptions: (shuffle: boolean) => void;
  setMaxAttempts: (max: number | null) => void;
  setSpacing: (spacing: number) => void;
  setColumns: (columns: 1 | 2) => void;
  setShowTypeName: (show: boolean) => void;
  setShowAnswerKey: (show: boolean) => void;
  setQuickAnswerOnly: (quick: boolean) => void;
  setTemplate: (template: 'default' | 'exam' | 'large' | 'minimal' | 'csat' | 'classic' | 'notebook' | 'formal' | 'bubble') => void;
  setColor: (color: string) => void;
  setShowDate: (show: boolean) => void;
  setShowChapter: (show: boolean) => void;
  setShowDifficulty: (show: boolean) => void;
  setShowDivider: (show: boolean) => void;
  setTags: (tags: string[]) => void;
  setIsDirty: (isDirty: boolean) => void;
  reset: () => void;
}

const initialState = {
  mode: 'test' as WizardMode,
  currentStep: 1 as const,
  schoolLevel: 'middle' as SchoolLevel,
  selectedBookCodes: [] as string[],
  checkedChapters: [] as string[],
  checkedSections: [] as string[],
  questionCount: 50,
  difficultyFilter: [] as string[],
  typeFilter: [] as string[],
  questions: [] as EditorQuestion[],
  questionDomains: {} as Record<string, LevelTestDomain>,
  title: '',
  grade: 7,
  testType: 'concept',
  timeLimitMin: null as number | null,
  shuffleOptions: false,
  maxAttempts: null as number | null,
  spacing: 40, // 기본 여백 40px
  columns: 2 as const,
  showTypeName: true,
  // Print options defaults
  template: 'exam' as const,
  color: '#135bec',
  showAnswerKey: true,
  quickAnswerOnly: false,
  showDate: true,
  showChapter: true,
  showDifficulty: true,
  showDivider: true,
  tags: [] as string[],
  isDirty: false,
};

export const useWizardStore = create<WizardState>((set, _get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),
  setStep: (step) => set({ currentStep: step }),
  setSchoolLevel: (level) => set({ schoolLevel: level, selectedBookCodes: [], checkedChapters: [], checkedSections: [] }),
  toggleBookCode: (code) => set((s) => {
    const has = s.selectedBookCodes.includes(code);
    return {
      selectedBookCodes: has
        ? s.selectedBookCodes.filter((c) => c !== code)
        : [...s.selectedBookCodes, code],
      isDirty: true,
    };
  }),
  setSelectedBookCodes: (codes) => set({ selectedBookCodes: codes, isDirty: true }),
  setCheckedChapters: (chapters) => set({ checkedChapters: chapters, isDirty: true }),
  setCheckedSections: (sections) => set({ checkedSections: sections, isDirty: true }),
  setQuestionCount: (count) => set({ questionCount: count, isDirty: true }),
  setDifficultyFilter: (filter) => set({ difficultyFilter: filter, isDirty: true }),
  setTypeFilter: (filter) => set({ typeFilter: filter, isDirty: true }),
  setQuestions: (questions) => set({ questions, isDirty: true }),
  addQuestion: (question, domain) => set((s) => {
    if (s.questions.some((q) => q.id === question.id)) return s;
    return {
      questions: [...s.questions, question],
      questionDomains: domain ? { ...s.questionDomains, [question.id]: domain } : s.questionDomains,
      isDirty: true,
    };
  }),
  removeQuestion: (id) => set((s) => {
    const domains = { ...s.questionDomains };
    delete domains[id];
    return {
      questions: s.questions.filter((q) => q.id !== id),
      questionDomains: domains,
      isDirty: true,
    };
  }),
  replaceQuestion: (oldId, newQuestion, domain) => set((s) => {
    const idx = s.questions.findIndex((q) => q.id === oldId);
    if (idx === -1) return s;
    const next = [...s.questions];
    next[idx] = newQuestion;
    const domains = { ...s.questionDomains };
    delete domains[oldId];
    if (domain) domains[newQuestion.id] = domain;
    return { questions: next, questionDomains: domains, isDirty: true };
  }),
  reorderQuestion: (from, to) => set((s) => {
    if (to < 0 || to >= s.questions.length) return s;
    const next = [...s.questions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return { questions: next, isDirty: true };
  }),
  sortQuestions: (criteria) => set((s) => {
    const DIFF_ORDER: Record<string, number> = { BASIC: 0, MEDIUM: 1, HIGH: 2, HIGHEST: 3 };
    const TYPE_ORDER: Record<string, number> = { MULTIPLE_CHOICE: 0, SHORT_ANSWER: 1, ESSAY: 2 };
    const DOMAIN_ORD: Record<string, number> = { CALCULATION: 0, UNDERSTANDING: 1, PROBLEM_SOLVING: 2, REASONING: 3 };

    const sorted = [...s.questions].sort((a, b) => {
      for (const c of criteria) {
        const dir = c.direction === 'asc' ? 1 : -1;
        let cmp = 0;
        switch (c.key) {
          case 'difficulty':
            cmp = (DIFF_ORDER[a.difficulty] ?? 99) - (DIFF_ORDER[b.difficulty] ?? 99);
            break;
          case 'type':
            cmp = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
            break;
          case 'domain':
            cmp = (DOMAIN_ORD[s.questionDomains[a.id]] ?? 99) - (DOMAIN_ORD[s.questionDomains[b.id]] ?? 99);
            break;
          case 'chapter':
            cmp = a.chapter.localeCompare(b.chapter, 'ko');
            break;
          case 'curriculum':
            cmp = a.bookCode.localeCompare(b.bookCode) || a.chapter.localeCompare(b.chapter, 'ko') || a.questionNum - b.questionNum;
            break;
        }
        if (cmp !== 0) return cmp * dir;
      }
      return 0;
    });
    return { questions: sorted, isDirty: true };
  }),
  setQuestionDomain: (id, domain) => set((s) => ({
    questionDomains: { ...s.questionDomains, [id]: domain },
    isDirty: true,
  })),
  setQuestionDomains: (domains) => set({ questionDomains: domains, isDirty: true }),
  setTitle: (title) => set({ title, isDirty: true }),
  setGrade: (grade) => set({ grade, isDirty: true }),
  setTestType: (type) => set({ testType: type, isDirty: true }),
  setTimeLimitMin: (min) => set({ timeLimitMin: min, isDirty: true }),
  setShuffleOptions: (shuffle) => set({ shuffleOptions: shuffle, isDirty: true }),
  setMaxAttempts: (max) => set({ maxAttempts: max, isDirty: true }),
  setSpacing: (spacing) => set({ spacing, isDirty: true }),
  setColumns: (columns) => set({ columns, isDirty: true }),
  setShowTypeName: (show) => set({ showTypeName: show, isDirty: true }),
  setShowAnswerKey: (show) => set({ showAnswerKey: show, isDirty: true }),
  setQuickAnswerOnly: (quick) => set({ quickAnswerOnly: quick, isDirty: true }),
  setTemplate: (template) => set({ template, isDirty: true }),
  setColor: (color) => set({ color, isDirty: true }),
  setShowDate: (show) => set({ showDate: show, isDirty: true }),
  setShowChapter: (show) => set({ showChapter: show, isDirty: true }),
  setShowDifficulty: (show) => set({ showDifficulty: show, isDirty: true }),
  setShowDivider: (show) => set({ showDivider: show, isDirty: true }),
  setTags: (tags) => set({ tags, isDirty: true }),
  setIsDirty: (isDirty) => set({ isDirty }),
  reset: () => set(initialState),
}));
