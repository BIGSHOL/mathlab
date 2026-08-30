/**
 * PDF Extract Engine — 범용 PDF → AI 구조화 추출 엔진
 *
 * 플러그인 기반 아키텍처로 어떤 도메인의 PDF든 구조화 추출 가능.
 *
 * ## 사용법
 *
 * ### 1. 플러그인 선택/생성
 * ```ts
 * // 기존 프리셋 사용
 * import { mathTextbookPlugin } from '@/lib/pdf-extract-engine/presets';
 *
 * // 또는 커스텀 플러그인 생성
 * const myPlugin: PdfExtractPlugin<MyItem> = { ... };
 * ```
 *
 * ### 2. React 위자드 훅 사용
 * ```tsx
 * import { usePdfExtract } from '@/lib/pdf-extract-engine/hooks';
 *
 * function MyPdfImport() {
 *   const wizard = usePdfExtract({
 *     plugin: mathTextbookPlugin,
 *     extractEndpoint: '/api/my-extract',
 *     onSave: async (items) => { ... },
 *   });
 *   // wizard.step, wizard.pages, wizard.items, ...
 * }
 * ```
 *
 * ### 3. API Route에서 직접 사용
 * ```ts
 * import { extractDirect } from '@/lib/pdf-extract-engine/ai';
 *
 * export async function POST(req) {
 *   const result = await extractDirect(pages, myPlugin, {
 *     apiKey: process.env.GEMINI_API_KEY!,
 *   });
 *   return NextResponse.json({ data: result.items });
 * }
 * ```
 *
 * ### 4. 코어 유틸만 사용
 * ```ts
 * import { loadPdf, renderThumbnailsBatched } from '@/lib/pdf-extract-engine/core';
 * ```
 */

// === Core: PDF 로딩/렌더링/텍스트/필터 ===
export {
  loadPdf,
  renderToCanvas,
  renderThumbnail,
  renderForAI,
  cropFromPage,
  renderThumbnailsBatched,
  renderPageForAI,
  extractPageText,
  createPageFilter,
} from './core';
export type { PDFDocumentProxy, PageFilterConfig } from './core';

// === AI: 추출 엔진 + 후처리 ===
export { extractViaProxy, extractDirect } from './ai';
export {
  fixLatexEscaping,
  stripCodeFence,
  deepFixText,
  stripDataUrlPrefix,
  estimateBase64Size,
} from './ai';

// === Hooks: React 위자드 ===
export { usePdfExtract } from './hooks';

// === Types: 범용 타입 ===
export type {
  PdfPageInfo,
  ExtractProgress,
  RenderedPage,
  BoundingBox,
  PdfExtractPlugin,
  ExtractionConfig,
  ExtractionResult,
  WizardStep,
  WizardConfig,
  WizardState,
} from './types';
