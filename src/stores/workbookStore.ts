import { create } from 'zustand';
import type {
  AnswerSpaceSizeInput,
  WorkbookKindInput,
  PrintOptionsInput,
} from '@/lib/schemas/workbook';

export type WizardStep = 1 | 2 | 3 | 4;

export interface DraftItem {
  /** 클라이언트 임시 ID — 서버 저장 시 새 cuid 발급 */
  tempId: string;
  kind: WorkbookKindInput;
  /** 폴리모픽 FK 참조 ID (kind에 따라 testId/questionId/conceptId/...) */
  refId: string;
  /** ARITHMETIC_DAY/HOMEWORK_DAY일 때 dayIndex */
  dayIndex?: number;
  answerSpace: AnswerSpaceSizeInput;
  customLabel?: string;
  /** 미리보기 라벨 (위자드 UI용 — 서버 저장 X) */
  displayTitle?: string;
}

export interface DraftSection {
  tempId: string;
  title: string;
  description?: string;
  startNewPage: boolean;
  items: DraftItem[];
}

export interface WorkbookMeta {
  title: string;
  subtitle: string;
  studentLabel: string;
  semesterLabel: string;
  academyName: string;
  ownerName: string;
}

const DEFAULT_PRINT_PRESET: PrintOptionsInput = {
  template: 'default',
  color: '#135bec',
  columns: 1,
  spacing: 16,
  showAnswers: false,
  quickAnswerOnly: false,
  showDate: true,
  showChapter: true,
  showDifficulty: false,
  showDivider: true,
};

interface WorkbookStore {
  currentStep: WizardStep;
  meta: WorkbookMeta;
  printPreset: PrintOptionsInput;
  defaultAnswerSpace: AnswerSpaceSizeInput;
  separateAnswerKey: boolean;
  showCover: boolean;
  showToc: boolean;
  sections: DraftSection[];

  // ── 액션 ──
  setStep: (step: WizardStep) => void;
  setMeta: (patch: Partial<WorkbookMeta>) => void;
  setPrintPreset: (patch: Partial<PrintOptionsInput>) => void;
  setDefaultAnswerSpace: (size: AnswerSpaceSizeInput) => void;
  setSeparateAnswerKey: (v: boolean) => void;
  setShowCover: (v: boolean) => void;
  setShowToc: (v: boolean) => void;

  addSection: (title: string) => string;
  updateSection: (tempId: string, patch: Partial<DraftSection>) => void;
  removeSection: (tempId: string) => void;
  reorderSections: (orderedIds: string[]) => void;

  addItem: (sectionTempId: string, item: Omit<DraftItem, 'tempId'>) => void;
  updateItem: (sectionTempId: string, itemTempId: string, patch: Partial<DraftItem>) => void;
  removeItem: (sectionTempId: string, itemTempId: string) => void;
  applyAnswerSpaceToAll: (size: AnswerSpaceSizeInput) => void;

  reset: () => void;
}

const genId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const INITIAL_META: WorkbookMeta = {
  title: '',
  subtitle: '',
  studentLabel: '',
  semesterLabel: '',
  academyName: '',
  ownerName: '',
};

export const useWorkbookStore = create<WorkbookStore>((set) => ({
  currentStep: 1,
  meta: INITIAL_META,
  printPreset: DEFAULT_PRINT_PRESET,
  defaultAnswerSpace: 'MEDIUM',
  separateAnswerKey: true,
  showCover: true,
  showToc: true,
  sections: [],

  setStep: (step) => set({ currentStep: step }),
  setMeta: (patch) => set((s) => ({ meta: { ...s.meta, ...patch } })),
  setPrintPreset: (patch) => set((s) => ({ printPreset: { ...s.printPreset, ...patch } })),
  setDefaultAnswerSpace: (size) => set({ defaultAnswerSpace: size }),
  setSeparateAnswerKey: (v) => set({ separateAnswerKey: v }),
  setShowCover: (v) => set({ showCover: v }),
  setShowToc: (v) => set({ showToc: v }),

  addSection: (title) => {
    const tempId = genId();
    set((s) => ({
      sections: [...s.sections, { tempId, title, startNewPage: true, items: [] }],
    }));
    return tempId;
  },
  updateSection: (tempId, patch) =>
    set((s) => ({
      sections: s.sections.map((sec) => (sec.tempId === tempId ? { ...sec, ...patch } : sec)),
    })),
  removeSection: (tempId) =>
    set((s) => ({ sections: s.sections.filter((sec) => sec.tempId !== tempId) })),
  reorderSections: (orderedIds) =>
    set((s) => {
      const map = new Map(s.sections.map((sec) => [sec.tempId, sec]));
      return { sections: orderedIds.map((id) => map.get(id)).filter((x): x is DraftSection => !!x) };
    }),

  addItem: (sectionTempId, item) =>
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.tempId === sectionTempId
          ? { ...sec, items: [...sec.items, { ...item, tempId: genId() }] }
          : sec,
      ),
    })),
  updateItem: (sectionTempId, itemTempId, patch) =>
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.tempId === sectionTempId
          ? {
              ...sec,
              items: sec.items.map((it) => (it.tempId === itemTempId ? { ...it, ...patch } : it)),
            }
          : sec,
      ),
    })),
  removeItem: (sectionTempId, itemTempId) =>
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.tempId === sectionTempId
          ? { ...sec, items: sec.items.filter((it) => it.tempId !== itemTempId) }
          : sec,
      ),
    })),
  applyAnswerSpaceToAll: (size) =>
    set((s) => ({
      sections: s.sections.map((sec) => ({
        ...sec,
        items: sec.items.map((it) => ({ ...it, answerSpace: size })),
      })),
    })),

  reset: () =>
    set({
      currentStep: 1,
      meta: INITIAL_META,
      printPreset: DEFAULT_PRINT_PRESET,
      defaultAnswerSpace: 'MEDIUM',
      separateAnswerKey: true,
      showCover: true,
      showToc: true,
      sections: [],
    }),
}));

export { DEFAULT_PRINT_PRESET };
