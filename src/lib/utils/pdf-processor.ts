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

/**
 * 텍스트 레이어 기반으로 문제 페이지인지 판별 (API 비용 절감)
 * 문제 번호 패턴(01, 1., (1) 등)이 없는 페이지는 비문제 페이지로 판단
 */
export function isProblemPage(textLayer: string): boolean {
  if (!textLayer || textLayer.length < 10) return false;

  // 비문제 페이지 키워드 (표지, 목차, 단원 표지 등)
  const skipKeywords = [
    /^목\s*차$/m,
    /구성과\s*특징/,
    /이\s*책의\s*(구성|특징)/,
    /차\s*례/,
    /학습\s*계획표/,
    /정답과\s*풀이/,  // 정답지 별도 처리
  ];
  for (const kw of skipKeywords) {
    if (kw.test(textLayer)) {
      // 키워드가 있어도 문제 번호가 함께 있으면 문제 페이지로 판단
      const hasNums = /(?:^|\s)(?:0[1-9]|[1-9]\d?)\s/.test(textLayer);
      if (!hasNums) return false;
    }
  }

  // 문제 번호 패턴 — 교재마다 다를 수 있으므로 넓게 잡음
  const problemPatterns = [
    /(?:^|\s)0[1-9](?:\s|$)/m,           // 01~09 (초등 교재)
    /(?:^|\s)[1-9]\d?\s*[.)]?\s/m,       // 1, 2, ... 또는 1. 2. 또는 1) 2)
    /\([1-9]\d?\)/,                       // (1), (2), ...
    /①|②|③|④|⑤/,                        // 객관식 보기 번호
    /문제\s*\d/,                           // "문제 1"
    /계산해?\s*보세요/,                    // 초등 연산 지시어
    /구하시오|구하여라|구해\s*보세요/,     // 풀이 지시어
    /써\s*넣으세요|써\s*봅시다/,           // 초등 지시어
    /풀어?\s*보세요|풀어라/,
  ];

  return problemPatterns.some((p) => p.test(textLayer));
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
  margin = 0.08
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

  // 비정상 크롭 검증 (면적 0.1% 미만 or 70% 초과)
  const areaRatio = (cropW * cropH) / (w * h);
  if (areaRatio < 0.001 || areaRatio > 0.7) {
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

  // 흰 배경 투명화 처리
  const imageData = ctx.getImageData(0, 0, cropW, cropH);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // 거의 흰색(RGB 각 240 이상)이면 투명 처리
    if (r >= 240 && g >= 240 && b >= 240) {
      data[i + 3] = 0; // alpha = 0
    }
  }
  ctx.putImageData(imageData, 0, 0);

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
