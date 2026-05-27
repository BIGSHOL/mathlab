/**
 * AI 추출 엔진 — Gemini Vision 기반 PDF 페이지 구조화 추출
 *
 * 플러그인의 스키마/프롬프트/후처리를 사용하여
 * PDF 페이지 이미지 → 구조화된 데이터로 변환
 *
 * 서버 사이드 (API Route)와 클라이언트 사이드 (직접 호출) 모두 지원
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import type {
  PdfExtractPlugin,
  ExtractionConfig,
  ExtractionResult,
  ExtractProgress,
  RenderedPage,
} from '../types';
import { extractPageText } from '../core/text-extractor';
import { renderForAI } from '../core/pdf-renderer';
import { stripCodeFence, stripDataUrlPrefix, estimateBase64Size } from './post-processor';

// 재시도 설정
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 1000; // 1초 → 2초 → 4초 (exponential)

/** 지수 백오프 재시도 래퍼 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable =
        err instanceof Error &&
        (/429|503|rate|limit|quota|overloaded/i.test(err.message));
      if (!isRetryable || attempt === MAX_RETRIES) break;
      const delay = RETRY_BASE_DELAY * 2 ** attempt;
      console.warn(`[pdf-extract-engine] ${label} 재시도 ${attempt + 1}/${MAX_RETRIES} (${delay}ms 대기)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ============================================================
// 클라이언트 사이드: PDF → 페이지 렌더링 → API 프록시 호출
// ============================================================

/**
 * 클라이언트 사이드 추출 — API 프록시를 통해 서버에서 AI 호출
 *
 * 브라우저에서 PDF 렌더링 후, 각 페이지를 서버 API에 전송하여 AI 추출
 * API 키가 클라이언트에 노출되지 않음
 *
 * @example
 * ```ts
 * const result = await extractViaProxy(pdf, [1,2,3], mathPlugin, {
 *   endpoint: '/api/questions/pdf-extract',
 *   onProgress: (p) => setProgress(p),
 *   meta: { bookCode: '1-1' },
 * });
 * ```
 */
export async function extractViaProxy<TItem, TMeta = unknown>(
  pdf: PDFDocumentProxy,
  pageNums: number[],
  plugin: PdfExtractPlugin<TItem, TMeta>,
  options: {
    endpoint: string;
    onProgress?: (progress: ExtractProgress) => void;
    meta?: TMeta;
    scale?: number;
    skipFilter?: boolean;
  },
): Promise<ExtractionResult<TItem>> {
  const { endpoint, onProgress, meta, scale = 2.0, skipFilter = false } = options;
  const items: TItem[] = [];
  const errors: { pageNum: number; error: string }[] = [];
  let skipped = 0;

  for (let i = 0; i < pageNums.length; i++) {
    const pageNum = pageNums[i];
    onProgress?.({ done: i, total: pageNums.length, currentPage: pageNum, skipped });

    try {
      // 텍스트 레이어 1회만 추출 (필터링 + AI 렌더링에 재사용)
      const textLayer = await extractPageText(pdf, pageNum);

      // 페이지 필터링
      if (!skipFilter && plugin.isTargetPage) {
        if (!textLayer || !plugin.isTargetPage(textLayer)) {
          skipped++;
          continue;
        }
      }

      // 이미지 렌더링 (텍스트는 위에서 이미 추출됨)
      const imageBase64 = await renderForAI(pdf, pageNum, scale);

      // API 프록시 호출 (재시도 포함)
      const json = await withRetry(async () => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pages: [{ pageNum, imageBase64, textLayer }],
            meta,
          }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
      }, `페이지 ${pageNum} API 호출`);

      // 플러그인 후처리
      const pageItems = plugin.postProcess(json.data?.[0] || json.data, pageNum, meta);
      items.push(...pageItems);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ pageNum, error: msg });
      console.error(`[pdf-extract-engine] 페이지 ${pageNum} 추출 실패:`, err);
    }
  }

  onProgress?.({ done: pageNums.length, total: pageNums.length, skipped });
  return { items, skipped, errors };
}

// ============================================================
// 서버 사이드: 직접 Gemini API 호출
// ============================================================

/**
 * 서버 사이드 추출 — Gemini API 직접 호출
 *
 * API Route 핸들러 내에서 사용.
 * 이미 렌더링된 페이지 이미지(base64)를 받아 AI 추출 수행.
 *
 * @example
 * ```ts
 * // API Route에서
 * const result = await extractDirect(renderedPages, mathPlugin, {
 *   apiKey: process.env.GEMINI_API_KEY!,
 * });
 * ```
 */
export async function extractDirect<TItem, TMeta = unknown>(
  pages: RenderedPage[],
  plugin: PdfExtractPlugin<TItem, TMeta>,
  config: ExtractionConfig<TMeta>,
): Promise<ExtractionResult<TItem>> {
  const {
    apiKey,
    model = 'gemini-3.1-pro-preview',
    onProgress,
    meta,
    maxImageSize = 5 * 1024 * 1024,
  } = config;

  // 동적 import (서버에서만 로드)
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const items: TItem[] = [];
  const errors: { pageNum: number; error: string }[] = [];
  let skipped = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    onProgress?.({ done: i, total: pages.length, currentPage: page.pageNum, skipped });

    try {
      // 이미지 크기 제한
      if (estimateBase64Size(page.imageBase64) > maxImageSize) {
        errors.push({ pageNum: page.pageNum, error: `이미지가 너무 큼 (${(maxImageSize / 1024 / 1024).toFixed(0)}MB 제한)` });
        continue;
      }

      // 페이지 필터링
      if (plugin.isTargetPage && page.textLayer) {
        if (!plugin.isTargetPage(page.textLayer)) {
          skipped++;
          continue;
        }
      }

      // 프롬프트 구성
      const userText = plugin.buildUserPrompt
        ? plugin.buildUserPrompt(plugin.systemPrompt, page.textLayer)
        : page.textLayer
          ? `${plugin.systemPrompt}\n\n[OCR Text Content for Reference]\n${page.textLayer}\n\n위의 텍스트 레이어 정보를 참고하여 이미지 속의 내용을 오타 없이 완벽하게 추출하세요.`
          : plugin.systemPrompt;

      const base64Data = stripDataUrlPrefix(page.imageBase64);

      // Gemini API 호출 (재시도 포함)
      const raw = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/png', data: base64Data } },
                { text: userText },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: plugin.responseSchema,
          },
        });

        if (!response.text) throw new Error('AI 응답 없음');
        const jsonStr = stripCodeFence(response.text);
        return JSON.parse(jsonStr);
      }, `페이지 ${page.pageNum} Gemini 호출`);

      // 플러그인 후처리
      const pageItems = plugin.postProcess(raw, page.pageNum, meta);
      items.push(...pageItems);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ pageNum: page.pageNum, error: msg });
      console.error(`[pdf-extract-engine] 페이지 ${page.pageNum} 추출 실패:`, err);
    }
  }

  onProgress?.({ done: pages.length, total: pages.length, skipped });
  return { items, skipped, errors };
}
