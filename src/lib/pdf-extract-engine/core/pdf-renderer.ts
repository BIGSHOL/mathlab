/**
 * PDF 렌더러 — 썸네일, AI용 고해상도, 크롭, 배치 렌더링
 *
 * 메모리 최적화: canvas.width=0 으로 즉시 해제, 배치 단위 처리
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderToCanvas } from './pdf-loader';
import type { PdfPageInfo, RenderedPage } from '../types';

/** 페이지 썸네일 (저해상도 JPEG, 선택 UI용) */
export async function renderThumbnail(
  pdf: PDFDocumentProxy,
  pageNum: number,
  scale = 0.25,
): Promise<string> {
  const canvas = await renderToCanvas(pdf, pageNum, scale);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

/** 페이지 고해상도 PNG (AI Vision용) */
export async function renderForAI(
  pdf: PDFDocumentProxy,
  pageNum: number,
  scale = 2.0,
): Promise<string> {
  const canvas = await renderToCanvas(pdf, pageNum, scale);
  const dataUrl = canvas.toDataURL('image/png');
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

/**
 * 바운딩 박스 크롭 → PNG base64
 *
 * @param bbox - [y_min, x_min, y_max, x_max] 정규화 좌표 (0~1000)
 * @param margin - 마진 비율 (기본 0.08 = 8%)
 * @param transparentBg - 흰 배경 투명화 (기본 true)
 */
export async function cropFromPage(
  pdf: PDFDocumentProxy,
  pageNum: number,
  bbox: [number, number, number, number],
  options?: { scale?: number; margin?: number; transparentBg?: boolean },
): Promise<string> {
  const { scale = 2.0, margin = 0.08, transparentBg = true } = options || {};
  const canvas = await renderToCanvas(pdf, pageNum, scale);
  const [yMin, xMin, yMax, xMax] = bbox;

  const w = canvas.width;
  const h = canvas.height;
  let px1 = (xMin / 1000) * w;
  let py1 = (yMin / 1000) * h;
  let px2 = (xMax / 1000) * w;
  let py2 = (yMax / 1000) * h;

  // 마진 보정
  const mw = (px2 - px1) * margin;
  const mh = (py2 - py1) * margin;
  px1 = Math.max(0, px1 - mw);
  py1 = Math.max(0, py1 - mh);
  px2 = Math.min(w, px2 + mw);
  py2 = Math.min(h, py2 + mh);

  const cropW = px2 - px1;
  const cropH = py2 - py1;

  // 비정상 크롭 검증
  const areaRatio = (cropW * cropH) / (w * h);
  if (areaRatio < 0.001 || areaRatio > 0.7) {
    canvas.width = 0;
    canvas.height = 0;
    throw new Error(`Invalid crop area: ${(areaRatio * 100).toFixed(1)}%`);
  }

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const ctx = cropCanvas.getContext('2d')!;
  ctx.drawImage(canvas, px1, py1, cropW, cropH, 0, 0, cropW, cropH);

  // 흰 배경 투명화
  if (transparentBg) {
    const imageData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] >= 240 && data[i + 1] >= 240 && data[i + 2] >= 240) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const dataUrl = cropCanvas.toDataURL('image/png');
  canvas.width = 0;
  canvas.height = 0;
  cropCanvas.width = 0;
  cropCanvas.height = 0;
  return dataUrl;
}

/**
 * 배치 썸네일 렌더링 — 메모리 절약
 *
 * 대용량 PDF(100MB+)에서 전체를 한번에 렌더링하면 메모리 폭주.
 * batchSize개씩 나누고, 각 배치 완료 시 콜백으로 중간 결과 전달.
 */
export async function renderThumbnailsBatched(
  pdf: PDFDocumentProxy,
  onBatch: (thumbnails: PdfPageInfo[], done: number, total: number) => void,
  batchSize = 10,
): Promise<void> {
  const total = pdf.numPages;
  for (let start = 1; start <= total; start += batchSize) {
    const end = Math.min(start + batchSize - 1, total);
    const batch: PdfPageInfo[] = [];
    for (let i = start; i <= end; i++) {
      const thumbnail = await renderThumbnail(pdf, i);
      batch.push({ pageNum: i, thumbnail });
    }
    onBatch(batch, end, total);
  }
}

/**
 * 페이지 AI 전송용 렌더링 (이미지 + 텍스트 동시)
 * text-extractor와 조합하여 RenderedPage 생성
 */
export async function renderPageForAI(
  pdf: PDFDocumentProxy,
  pageNum: number,
  textExtractor: (pdf: PDFDocumentProxy, pageNum: number) => Promise<string>,
  scale = 2.0,
): Promise<RenderedPage> {
  const [imageBase64, textLayer] = await Promise.all([
    renderForAI(pdf, pageNum, scale),
    textExtractor(pdf, pageNum),
  ]);
  return { pageNum, imageBase64, textLayer };
}
