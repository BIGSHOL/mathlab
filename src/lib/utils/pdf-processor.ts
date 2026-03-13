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
    const strings = textContent.items
      .filter((item): item is { str: string } & typeof item => 'str' in item)
      .map((item) => item.str);
    return strings.join(' ').trim();
  } catch (err) {
    console.warn(`[pdf-processor] 페이지 ${pageNum} 텍스트 추출 실패:`, err);
    return '';
  }
}

/** 페이지 고해상도 base64 이미지 렌더링 */
async function renderPageFullRes(
  pdf: PDFDocumentProxy,
  pageNum: number,
  scale: number
): Promise<string> {
  const canvas = await renderToCanvas(pdf, pageNum, scale);
  const dataUrl = canvas.toDataURL('image/png');
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
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
 * PDF 페이지에서 바운딩 박스 영역을 크롭하여 base64 PNG로 반환
 * @param pdf - PDF 문서
 * @param pageNum - 페이지 번호 (1-based)
 * @param bbox - [y_min, x_min, y_max, x_max] 정규화 좌표 (0~1000)
 * @param scale - 렌더링 스케일 (기본 2.0)
 * @param margin - 마진 비율 (기본 0.05 = 5%)
 */
export async function cropImageFromPage(
  pdf: PDFDocumentProxy,
  pageNum: number,
  bbox: [number, number, number, number],
  scale = 2.0,
  margin = 0.05
): Promise<string> {
  const canvas = await renderToCanvas(pdf, pageNum, scale);
  const [yMin, xMin, yMax, xMax] = bbox;

  // 정규화 좌표(0~1000) → 픽셀 변환
  const w = canvas.width;
  const h = canvas.height;
  let px1 = (xMin / 1000) * w;
  let py1 = (yMin / 1000) * h;
  let px2 = (xMax / 1000) * w;
  let py2 = (yMax / 1000) * h;

  // 마진 추가 (Gemini 좌표 부정확성 보정)
  const mw = (px2 - px1) * margin;
  const mh = (py2 - py1) * margin;
  px1 = Math.max(0, px1 - mw);
  py1 = Math.max(0, py1 - mh);
  px2 = Math.min(w, px2 + mw);
  py2 = Math.min(h, py2 + mh);

  const cropW = px2 - px1;
  const cropH = py2 - py1;

  // 비정상 크롭 검증 (면적 0.5% 미만 or 70% 초과)
  const areaRatio = (cropW * cropH) / (w * h);
  if (areaRatio < 0.005 || areaRatio > 0.7) {
    canvas.width = 0;
    canvas.height = 0;
    throw new Error(`Invalid crop area: ${(areaRatio * 100).toFixed(1)}%`);
  }

  // 크롭 캔버스 생성
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const ctx = cropCanvas.getContext('2d')!;
  ctx.drawImage(canvas, px1, py1, cropW, cropH, 0, 0, cropW, cropH);

  const dataUrl = cropCanvas.toDataURL('image/png');

  // 메모리 정리
  canvas.width = 0;
  canvas.height = 0;
  cropCanvas.width = 0;
  cropCanvas.height = 0;

  return dataUrl;
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
