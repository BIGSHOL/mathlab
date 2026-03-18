/**
 * PDF 로더 — pdfjs-dist 동적 로딩 및 PDF 파일 파싱
 *
 * 클라이언트 사이드 전용. 동적 import로 번들 크기 최적화.
 * CMap 설정으로 CJK(한글/중국어/일본어) 텍스트 지원.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';

export type { PDFDocumentProxy };

/** pdfjs-dist 동적 로드 + 워커 설정 */
async function getPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  return pdfjsLib;
}

/** PDF 파일 → PDFDocumentProxy 로드 */
export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  }).promise;
}

/** 캔버스에 PDF 페이지 렌더링 (내부 공용) */
export async function renderToCanvas(
  pdf: PDFDocumentProxy,
  pageNum: number,
  scale: number,
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
