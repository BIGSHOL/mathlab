'use client';

/**
 * 범용 PDF 추출 위자드 훅
 *
 * 4단계 위자드 상태머신을 제공합니다:
 * 1. PDF 업로드 + 썸네일 로딩
 * 2. 페이지 선택
 * 3. AI 추출 + 미리보기/편집
 * 4. 저장
 *
 * 도메인 로직은 WizardConfig의 plugin/onSave로 주입합니다.
 *
 * @example
 * ```tsx
 * const wizard = usePdfExtract({
 *   plugin: mathTextbookPlugin,
 *   extractEndpoint: '/api/questions/pdf-extract',
 *   onSave: async (items) => {
 *     const res = await fetch('/api/questions/bulk', { ... });
 *     return res.json().data;
 *   },
 * });
 * ```
 */

import { useState, useRef, useCallback } from 'react';
import type {
  PdfPageInfo,
  ExtractProgress,
  WizardStep,
  WizardConfig,
  WizardState,
} from '../types';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export function usePdfExtract<TItem, TMeta = unknown>(
  config: WizardConfig<TItem, TMeta>,
): WizardState<TItem> {
  const { plugin, extractEndpoint, onSave, getMeta } = config;

  // 단계
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1: 업로드
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const _fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: 페이지 선택
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [thumbPage, setThumbPage] = useState(1);
  const THUMBS_PER_PAGE = 30;

  // Step 3: 추출 & 편집
  const [items, setItems] = useState<TItem[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<ExtractProgress>({ done: 0, total: 0 });

  // Step 4: 저장
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);
  const [error, setError] = useState('');

  // --- PDF 로드 ---
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('PDF 파일만 업로드 가능합니다');
      return;
    }
    setLoadingPdf(true);
    setError('');
    try {
      const { loadPdf, renderThumbnailsBatched } = await import('../core');
      const doc = await loadPdf(file);
      setPdfDoc(doc);

      // 빈 슬롯 생성 (즉시 UI 표시)
      setPages(
        Array.from({ length: doc.numPages }, (_, i) => ({
          pageNum: i + 1,
          thumbnail: '',
        })),
      );

      // 배치 썸네일 렌더링
      await renderThumbnailsBatched(doc, (batch, done, total) => {
        setPages((prev) => {
          const next = [...prev];
          for (const item of batch) {
            next[item.pageNum - 1] = item;
          }
          return next;
        });
        if (done >= Math.ceil(total / 2)) {
          setLoadingPdf(false);
        }
      });
    } catch (err) {
      console.error('[pdf-extract-engine] PDF 로드 실패:', err);
      setError(`PDF를 로드할 수 없습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setLoadingPdf(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const clearPdf = useCallback(() => {
    setPdfDoc(null);
    setPages([]);
    setSelectedPages(new Set());
    setItems([]);
    setResult(null);
    setError('');
    setStep(1);
  }, []);

  // --- 페이지 선택 ---
  const togglePage = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  };

  const selectAll = () => setSelectedPages(new Set(pages.map((p) => p.pageNum)));
  const deselectAll = () => setSelectedPages(new Set());

  const applyRange = () => {
    const match = rangeInput.match(/^(\d+)\s*[-~]\s*(\d+)$/);
    if (!match) return;
    const [, startStr, endStr] = match;
    const start = Number(startStr);
    const end = Number(endStr);
    const next = new Set(selectedPages);
    for (let i = start; i <= end && i <= pages.length; i++) next.add(i);
    setSelectedPages(next);
    setRangeInput('');
  };

  // --- AI 추출 ---
  const startExtraction = async () => {
    if (!pdfDoc || selectedPages.size === 0) return;
    setExtracting(true);
    setItems([]);
    setError('');

    try {
      const { extractViaProxy } = await import('../ai');
      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);

      const res = await extractViaProxy(pdfDoc, sortedPages, plugin, {
        endpoint: extractEndpoint,
        onProgress: setProgress,
        meta: getMeta?.(),
        skipFilter: false,
      });

      setItems(res.items);
      if (res.items.length === 0) {
        setError('추출된 항목이 없습니다. 다른 페이지를 선택해보세요.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '추출 중 오류가 발생했습니다');
    } finally {
      setExtracting(false);
    }
  };

  // --- 아이템 편집 ---
  const updateItem = (idx: number, updates: Partial<TItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...updates } : item)));
  };

  const deleteItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- 저장 ---
  const handleSave = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await onSave(items);
      setResult(res);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    pdfDoc,
    pages,
    loadingPdf,
    handleFileSelect,
    handleDrop,
    clearPdf,
    selectedPages,
    togglePage,
    selectAll,
    deselectAll,
    rangeInput,
    setRangeInput,
    applyRange,
    thumbPage,
    setThumbPage,
    THUMBS_PER_PAGE,
    items,
    extracting,
    progress,
    startExtraction,
    updateItem,
    deleteItem,
    submitting,
    result,
    error,
    setError,
    handleSave,
  };
}
