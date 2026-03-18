/**
 * PDF Extract Engine — 범용 타입 정의
 *
 * 어떤 프로젝트에서든 PDF → AI 추출 → 결과 파이프라인을 구성할 수 있도록
 * 도메인에 종속되지 않는 범용 타입만 정의합니다.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';

// ============================================================
// Core Types
// ============================================================

/** PDF 페이지 정보 (썸네일 포함) */
export interface PdfPageInfo {
  pageNum: number;
  thumbnail: string; // base64 data URL
}

/** AI 추출 진행 상태 */
export interface ExtractProgress {
  done: number;
  total: number;
  currentPage?: number;
  skipped?: number;
}

/** 페이지 렌더링 결과 (AI 전송용) */
export interface RenderedPage {
  pageNum: number;
  imageBase64: string; // PNG base64 data URL
  textLayer: string;   // OCR 텍스트
}

/** 이미지 바운딩 박스 (정규화 좌표 0~1000) */
export interface BoundingBox {
  box: [number, number, number, number]; // [y_min, x_min, y_max, x_max]
  label: string;
}

// ============================================================
// Plugin Interface — 도메인별 확장 포인트
// ============================================================

/**
 * PDF 추출 플러그인 인터페이스
 *
 * @template TItem - 추출 결과 아이템 타입 (문제, 질문, 항목 등)
 * @template TMeta - 추가 메타데이터 타입 (bookCode, chapter 등)
 *
 * @example
 * ```ts
 * const mathPlugin: PdfExtractPlugin<MathProblem, { bookCode: string }> = {
 *   name: 'math-textbook',
 *   responseSchema: { ... },
 *   systemPrompt: '당신은 수학 교재 분석 전문가입니다...',
 *   postProcess: (raw, pageNum) => raw.problems.map(...),
 * };
 * ```
 */
export interface PdfExtractPlugin<TItem, TMeta = unknown> {
  /** 플러그인 이름 (로깅/디버깅용) */
  name: string;

  /** Gemini 응답 JSON 스키마 (Google GenAI Type 기반) */
  responseSchema: Record<string, unknown>;

  /** AI 시스템 프롬프트 */
  systemPrompt: string;

  /**
   * 페이지 필터: 텍스트 레이어로 추출 대상 여부 판별
   * - 반환 true → 추출 대상
   * - 반환 false → 스킵 (API 비용 절감)
   * - 미정의 시 모든 페이지 추출
   */
  isTargetPage?: (textLayer: string) => boolean;

  /**
   * AI 응답 후처리: raw JSON → 정규화된 아이템 배열
   * 각 도메인에서 AI 응답을 자체 타입으로 변환
   */
  postProcess: (raw: unknown, pageNum: number, meta?: TMeta) => TItem[];

  /**
   * 텍스트 후처리 (LaTeX 이스케이프 복원 등)
   * AI 응답의 모든 텍스트 필드에 적용
   */
  fixText?: (text: string) => string;

  /**
   * 추가 프롬프트 생성 (OCR 텍스트 기반)
   * 기본: textLayer를 참고 정보로 첨부
   */
  buildUserPrompt?: (systemPrompt: string, textLayer?: string) => string;
}

// ============================================================
// Extraction Config & Result
// ============================================================

/** 추출 엔진 설정 */
export interface ExtractionConfig<TMeta = unknown> {
  /** Gemini API 키 */
  apiKey: string;
  /** AI 모델 (기본: 'gemini-2.5-flash') */
  model?: string;
  /** 렌더링 스케일 (기본: 2.0) */
  scale?: number;
  /** 진행 콜백 */
  onProgress?: (progress: ExtractProgress) => void;
  /** 페이지 필터 비활성화 */
  skipFilter?: boolean;
  /** 플러그인에 전달할 메타데이터 */
  meta?: TMeta;
  /** 페이지당 이미지 최대 크기 (바이트, 기본: 5MB) */
  maxImageSize?: number;
}

/** 추출 결과 */
export interface ExtractionResult<TItem> {
  items: TItem[];
  skipped: number;
  errors: { pageNum: number; error: string }[];
}

// ============================================================
// Wizard Hook Types
// ============================================================

export type WizardStep = 1 | 2 | 3 | 4;

/** 범용 위자드 훅 설정 */
export interface WizardConfig<TItem, TMeta = unknown> {
  /** 추출 플러그인 */
  plugin: PdfExtractPlugin<TItem, TMeta>;
  /** Gemini API 호출 엔드포인트 (서버 사이드 프록시) */
  extractEndpoint: string;
  /** 저장 함수 */
  onSave: (items: TItem[]) => Promise<{ created: number }>;
  /** 메타데이터 생성 함수 */
  getMeta?: () => TMeta;
}

/** 위자드 훅 반환 타입 */
export interface WizardState<TItem> {
  // 단계
  step: WizardStep;
  setStep: (step: WizardStep) => void;

  // Step 1: 업로드
  pdfDoc: PDFDocumentProxy | null;
  pages: PdfPageInfo[];
  loadingPdf: boolean;
  handleFileSelect: (file: File) => Promise<void>;
  handleDrop: (e: React.DragEvent) => void;
  clearPdf: () => void;

  // Step 2: 페이지 선택
  selectedPages: Set<number>;
  togglePage: (pageNum: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  rangeInput: string;
  setRangeInput: (v: string) => void;
  applyRange: () => void;
  thumbPage: number;
  setThumbPage: (v: number) => void;
  THUMBS_PER_PAGE: number;

  // Step 3: 추출 & 편집
  items: TItem[];
  extracting: boolean;
  progress: ExtractProgress;
  startExtraction: () => Promise<void>;
  updateItem: (idx: number, updates: Partial<TItem>) => void;
  deleteItem: (idx: number) => void;

  // Step 4: 저장
  submitting: boolean;
  result: { created: number } | null;
  error: string;
  setError: (v: string) => void;
  handleSave: () => Promise<void>;
}

export type { PDFDocumentProxy };
