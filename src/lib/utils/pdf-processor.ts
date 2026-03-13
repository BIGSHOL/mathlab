import type { PDFDocumentProxy } from 'pdfjs-dist';

export type { PDFDocumentProxy };

/** 동적으로 pdfjs-dist 로드 (클라이언트 전용) */
async function getPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  return pdfjsLib;
}

/** PDF 파일 로드 */
export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  }).promise;
}

/** 캔버스에 페이지 렌더링 (공용) */
async function renderToCanvas(
  pdf: PDFDocumentProxy,
  pageNum: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return canvas;
}

/** 페이지 썸네일 렌더링 (저해상도, 선택 UI용) */
export async function renderPageThumbnail(
  pdf: PDFDocumentProxy,
  pageNum: number,
  scale = 0.25
): Promise<string> {
  const canvas = await renderToCanvas(pdf, pageNum, scale);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

/** 페이지 텍스트 레이어 추출 (하이브리드 AI 추출용) */
export async function extractPageText(
  pdf: PDFDocumentProxy,
  pageNum: number
): Promise<string> {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item: any) => item.str);
    return strings.join(' ').trim();
  } catch (err) {
    console.warn(`[pdf-processor] 페이지 ${pageNum} 텍스트 추출 실패:`, err);
    return '';
  }
}

/** 페이지 고해상도 이미지 + 텍스트 추출 (AI 하이브리드용) */
export async function renderPageForAI(
  pdf: PDFDocumentProxy,
  pageNum: number,
  scale = 2.0
): Promise<{ imageBase64: string; textLayer: string }> {
  const [imageBase64, textLayer] = await Promise.all([
    renderPageFullRes(pdf, pageNum, scale),
    extractPageText(pdf, pageNum),
  ]);
  return { imageBase64, textLayer };
}

/**
 * 썸네일 배치 렌더링 — 한 번에 batchSize개씩 렌더링하여 메모리 절약
 * 대용량 PDF(100MB+)에서 전체 썸네일을 한번에 만들면 메모리 폭주하므로
 * 배치 단위로 나누고 각 배치 완료 시 콜백으로 중간 결과 전달
 */
export async function renderThumbnailsBatched(
  pdf: PDFDocumentProxy,
  onBatch: (thumbnails: { pageNum: number; thumbnail: string }[], done: number, total: number) => void,
  batchSize = 10
): Promise<void> {
  const total = pdf.numPages;
  for (let start = 1; start <= total; start += batchSize) {
    const end = Math.min(start + batchSize - 1, total);
    const batch: { pageNum: number; thumbnail: string }[] = [];
    for (let i = start; i <= end; i++) {
      const thumb = await renderPageThumbnail(pdf, i);
      batch.push({ pageNum: i, thumbnail: thumb });
    }
    onBatch(batch, end, total);
  }
}
