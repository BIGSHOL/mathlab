/**
 * 텍스트 추출기 — PDF 페이지의 텍스트 레이어 추출
 *
 * AI 하이브리드 추출의 OCR 참조용 + 페이지 필터링 기반 데이터
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';

/** PDF 페이지에서 텍스트 레이어 추출 */
export async function extractPageText(
  pdf: PDFDocumentProxy,
  pageNum: number,
): Promise<string> {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .filter((item): item is { str: string } & typeof item => 'str' in item)
      .map((item) => item.str);
    return strings.join(' ').trim();
  } catch (err) {
    console.warn(`[pdf-extract-engine] 페이지 ${pageNum} 텍스트 추출 실패:`, err);
    return '';
  }
}
