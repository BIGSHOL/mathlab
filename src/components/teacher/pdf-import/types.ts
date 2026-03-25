import type { QuestionDifficulty, QuestionType } from '@/types';
import type {
  ExtractedProblem,
  ExtractedConcept,
  PdfPageInfo,
  PdfExtractProgress,
  ExtractionMode,
} from '@/types/pdf-extract';

// --- 상수 ---
export const MIDDLE_BOOK_CODES = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'];
export const ELEMENTARY_BOOK_CODES = ['E3-1', 'E3-2', 'E4-1', 'E4-2', 'E5-1', 'E5-2', 'E6-1', 'E6-2'];

export const DIFFICULTY_OPTIONS: { value: QuestionDifficulty; label: string }[] = [
  { value: 'BASIC', label: '하' },
  { value: 'MEDIUM', label: '중' },
  { value: 'HIGH', label: '상' },
  { value: 'HIGHEST', label: '최상' },
];

export const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: '객관식' },
  { value: 'SHORT_ANSWER', label: '단답형' },
  { value: 'ESSAY', label: '서술형' },
];

export const STEPS = ['업로드 & 설정', '페이지 선택', 'AI 추출 & 미리보기', '저장 완료'] as const;

export type StepNumber = 1 | 2 | 3 | 4;

// --- Hook 반환 타입 ---
export interface PdfImportState {
  // 단계 관리
  step: StepNumber;
  setStep: (step: StepNumber) => void;

  // Step 1: 업로드 & 설정
  pdfFile: File | null;
  pdfDoc: import('pdfjs-dist').PDFDocumentProxy | null;
  pages: PdfPageInfo[];
  bookCode: string;
  setBookCode: (code: string) => void;
  chapters: string[];
  setChapters: React.Dispatch<React.SetStateAction<string[]>>;
  loadingPdf: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (file: File) => Promise<void>;
  handleDrop: (e: React.DragEvent) => void;
  clearPdf: () => void;
  subjects: { id: string; title: string; gradeLevel: number }[];
  displaySubjects: { id: string; title: string; gradeLevel: number }[];
  subjectId: string;
  setSubjectId: (id: string) => void;

  // 추출 모드
  extractionMode: ExtractionMode;
  setExtractionMode: (mode: ExtractionMode) => void;

  // Step 2: 페이지 선택
  selectedPages: Set<number>;
  rangeInput: string;
  setRangeInput: (input: string) => void;
  thumbPage: number;
  setThumbPage: React.Dispatch<React.SetStateAction<number>>;
  THUMBS_PER_PAGE: number;
  togglePage: (pageNum: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  applyRange: () => void;

  // Step 3: AI 추출 & 미리보기
  problems: ExtractedProblem[];
  extracting: boolean;
  progress: PdfExtractProgress;
  editingIdx: number | null;
  setEditingIdx: (idx: number | null) => void;
  expandedIdx: number | null;
  setExpandedIdx: (idx: number | null) => void;
  concepts: ExtractedConcept[];
  setConcepts: React.Dispatch<React.SetStateAction<ExtractedConcept[]>>;
  saveConcepts: boolean;
  setSaveConcepts: (save: boolean) => void;
  startExtraction: () => Promise<void>;
  updateProblem: (idx: number, updates: Partial<ExtractedProblem>) => void;
  deleteProblem: (idx: number) => void;

  // AI 풀이 생성
  generatingSolutions: boolean;
  generateProgress: { done: number; total: number };
  startGenerateSolutions: () => Promise<void>;

  // 해설 PDF
  matchingSolutions: boolean;
  solutionInputRef: React.RefObject<HTMLInputElement | null>;
  solutionProgress: { done: number; total: number };
  matchResult: { total: number; matched: number } | null;
  solutionPageRange: string;
  setSolutionPageRange: (range: string) => void;
  solutionPdfDoc: import('pdfjs-dist').PDFDocumentProxy | null;
  solutionTotalPages: number;
  handleSolutionFileSelect: (file: File) => Promise<void>;
  startSolutionExtract: () => Promise<void>;
  clearSolutionPdf: () => void;

  // Step 4: 저장
  submitting: boolean;
  result: { created: number; conceptsCreated?: number } | null;
  error: string;
  setError: (error: string) => void;
  handleSave: () => Promise<void>;

  // Auth
  isOwner: boolean;

  // 크래시 복구
  recoveryData: { problems: ExtractedProblem[]; concepts: ExtractedConcept[]; bookCode: string; savedAt: number } | null;
  restoreBackup: () => void;
  dismissBackup: () => void;
}
