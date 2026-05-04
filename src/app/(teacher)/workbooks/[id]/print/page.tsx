'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { A4Page, A4PrintPage } from '@/components/print-preview/A4Page';
import { ZoomToolbar } from '@/components/print-preview/ZoomToolbar';
import { usePreviewScale } from '@/hooks/usePreviewScale';
import { CoverPageContent } from '@/components/workbook-print/CoverPage';
import { TocPageContent } from '@/components/workbook-print/TocPage';
import { SectionDividerContent } from '@/components/workbook-print/SectionDivider';
import {
  SectionContentPageInner,
  paginateItems,
  estimateItemHeight,
} from '@/components/workbook-print/SectionContentPages';
import { PAGE_CONTENT_HEIGHT } from '@/lib/utils/print-estimate';
import type { NormalizedItem } from '@/lib/services/workbook/sources';
import type { PrintOptionsInput } from '@/lib/schemas/workbook';

interface PrintWorkbook {
  id: string;
  title: string;
  subtitle: string | null;
  studentLabel: string | null;
  semesterLabel: string | null;
  academyName: string | null;
  ownerName: string | null;
  printPreset: PrintOptionsInput;
  defaultAnswerSpace: string;
  separateAnswerKey: boolean;
  showToc: boolean;
  showCover: boolean;
  pageEstimates: Record<string, number> | null;
}

interface PrintSection {
  id: string;
  title: string;
  description: string | null;
  startNewPage: boolean;
  sortOrder: number;
  /** 1 또는 2 — null이면 워크북 전역 columns 따름 */
  columnsOverride: 1 | 2 | null;
  items: NormalizedItem[];
}

interface PrintPayload {
  workbook: PrintWorkbook;
  sections: PrintSection[];
}

const TOC_ROWS_PER_PAGE = 20;

type CalcState = 'loading' | 'first-render' | 'measuring' | 'second-render' | 'ready';

export default function WorkbookPrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [payload, setPayload] = useState<PrintPayload | null>(null);
  const [calcState, setCalcState] = useState<CalcState>('loading');

  // 표준 인쇄 미리보기 엔진
  const {
    scale,
    setScale,
    scalePercent,
    galleryRef,
    fitToContainer,
    setScaleFromSlider,
  } = usePreviewScale();

  useEffect(() => {
    fetch(`/api/workbooks/${id}/print`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error.message);
        setPayload(j.data);
        setCalcState('first-render');
      })
      .catch(() => {
        toast.error('워크북을 불러오지 못했습니다');
        router.push('/workbooks');
      });
  }, [id, router]);

  // 2-pass 페이지 번호 계산
  const { sectionStartPages, totalPages } = useMemo(() => {
    if (!payload) return { sectionStartPages: {} as Record<string, number>, totalPages: 0 };
    return computePageEstimates(payload);
  }, [payload]);

  // 평면 페이지 배열 — 각 페이지가 ReactNode로 캡슐화됨
  // A4Page (미리보기) 와 A4PrintPage (인쇄) 양쪽에서 동일하게 렌더
  const flatPages = useMemo<ReactNode[]>(() => {
    if (!payload) return [];
    const { workbook, sections } = payload;
    const accentColor = workbook.printPreset.color;
    const tocEntries = sections.map((s) => ({
      sectionId: s.id,
      title: s.title,
      pageNumber: sectionStartPages[s.id] ?? 1,
    }));

    const pages: ReactNode[] = [];

    if (workbook.showCover) {
      pages.push(
        <CoverPageContent
          title={workbook.title}
          subtitle={workbook.subtitle}
          studentLabel={workbook.studentLabel}
          semesterLabel={workbook.semesterLabel}
          academyName={workbook.academyName}
          ownerName={workbook.ownerName}
          accentColor={accentColor}
        />
      );
    }

    if (workbook.showToc && tocEntries.length > 0) {
      pages.push(<TocPageContent entries={tocEntries} accentColor={accentColor} />);
    }

    sections.forEach((section, sIdx) => {
      const startPage = sectionStartPages[section.id] ?? 1;
      const isFirstSection = sIdx === 0 && !workbook.showCover && !workbook.showToc;

      if (section.startNewPage) {
        pages.push(
          <SectionDividerContent
            index={sIdx + 1}
            title={section.title}
            description={section.description}
            accentColor={accentColor}
          />
        );
      }

      const startPageNumber = section.startNewPage ? startPage + 1 : startPage;
      const effectivePreset = section.columnsOverride
        ? { ...workbook.printPreset, columns: section.columnsOverride }
        : workbook.printPreset;
      const itemPages = paginateItems(section.items, effectivePreset);
      itemPages.forEach((pageItems, pIdx) => {
        pages.push(
          <SectionContentPageInner
            workbookTitle={workbook.title}
            sectionTitle={section.title}
            pageNumber={startPageNumber + pIdx}
            pageItems={pageItems}
            preset={effectivePreset}
            isFirstPage={isFirstSection && pIdx === 0}
          />
        );
      });
    });

    return pages;
  }, [payload, sectionStartPages]);

  // 계산이 끝나면 ready 상태로 전환 (다음 frame에서)
  useEffect(() => {
    if (calcState === 'first-render' && payload) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCalcState('ready'));
      });
    }
  }, [calcState, payload]);

  // ready 진입 시 페이지 추정 캐시 저장 (다음 인쇄 시 즉시 표시 최적화)
  // 캐시값과 신규 계산값이 동일하면 스킵하여 불필요한 PUT 회피
  useEffect(() => {
    if (calcState !== 'ready' || !payload) return;
    const cached = (payload.workbook.pageEstimates as Record<string, number> | null) ?? null;
    const sameAsCached =
      cached &&
      Object.keys(sectionStartPages).length === Object.keys(cached).length &&
      Object.entries(sectionStartPages).every(([k, v]) => cached[k] === v);
    if (sameAsCached) return;

    const controller = new AbortController();
    fetch(`/api/workbooks/${id}/page-estimates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estimates: sectionStartPages }),
      signal: controller.signal,
    }).catch(() => {
      // 캐시 저장은 best-effort — 실패해도 사용자에게 노출하지 않음
    });
    return () => controller.abort();
  }, [calcState, payload, sectionStartPages, id]);

  // 인쇄 차단: 계산 중 Ctrl+P 차단
  useEffect(() => {
    function blockKey(e: KeyboardEvent) {
      if (calcState !== 'ready' && (e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        toast.warning('페이지 계산이 끝나기 전에는 인쇄할 수 없습니다');
      }
    }
    function blockBeforePrint(e: Event) {
      if (calcState !== 'ready') {
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', blockKey);
    window.addEventListener('beforeprint', blockBeforePrint);
    return () => {
      window.removeEventListener('keydown', blockKey);
      window.removeEventListener('beforeprint', blockBeforePrint);
    };
  }, [calcState]);

  function handlePrint() {
    if (calcState !== 'ready') {
      toast.warning('페이지 계산이 완료될 때까지 잠시 기다려 주세요');
      return;
    }
    window.print();
  }

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { workbook, sections } = payload;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 인쇄 시 숨김 — 미리보기용 헤더 */}
      <div className="print:hidden shrink-0 px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/workbooks/${id}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          편집으로
        </Button>
        <div className="text-sm text-slate-500">
          {sections.length}개 섹션 · 총 {totalPages}페이지
        </div>
        <div className="w-[88px]" />
      </div>

      {/* 표준 줌 툴바 (다른 인쇄 페이지와 동일 패턴) */}
      <ZoomToolbar
        scale={scale}
        scalePercent={scalePercent}
        onScaleFromSlider={setScaleFromSlider}
        onSetScale={setScale}
        onFitToContainer={fitToContainer}
        onPrint={calcState === 'ready' ? handlePrint : undefined}
        leftContent={
          <>
            <span className="text-sm font-bold text-text-primary truncate max-w-[280px]">{workbook.title}</span>
            <span className="text-xs text-text-secondary">
              {sections.length}개 섹션 · {flatPages.length}페이지
            </span>
          </>
        }
      />

      {/* 계산 중 인쇄 차단 오버레이 */}
      {calcState !== 'ready' && (
        <div className="fixed inset-0 z-40 bg-white/85 flex items-center justify-center print:hidden">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-slate-700 font-medium">목차 및 페이지를 계산 중입니다...</p>
            <p className="text-xs text-slate-500 mt-1">잠시 후 인쇄가 가능해집니다</p>
          </div>
        </div>
      )}

      {/* A4 미리보기 갤러리 (가로 스크롤, A4Page에 그림자/테두리) */}
      <div
        ref={galleryRef}
        className="flex-1 overflow-x-auto overflow-y-auto p-2.5 bg-slate-100 print:hidden"
      >
        <div className="flex gap-3 h-full items-start">
          {flatPages.map((page, idx) => (
            <A4Page key={idx} scale={scale} paddingClass="px-12 py-10">
              {page}
            </A4Page>
          ))}
        </div>
      </div>

      {/* 실제 인쇄용 렌더링 */}
      <div className="hidden print:block">
        {flatPages.map((page, idx) => (
          <A4PrintPage key={idx} paddingClass="px-12 py-10">
            {page}
          </A4PrintPage>
        ))}
      </div>
    </div>
  );
}

/**
 * 2-pass 페이지 번호 계산.
 *
 * 1차: cover(1p?) + 본문 누적 → tentative startPage
 * 2차: TOC 페이지 수 산출 후 모든 후속 페이지 시프트
 */
function computePageEstimates(payload: PrintPayload): {
  sectionStartPages: Record<string, number>;
  totalPages: number;
} {
  const { workbook, sections } = payload;
  const coverPages = workbook.showCover ? 1 : 0;

  // 1차: 표지 다음 페이지부터 누적
  let cursor = coverPages + 1; // TOC 자리 미반영
  const tentativeStarts: Record<string, number> = {};

  for (const section of sections) {
    tentativeStarts[section.id] = cursor;
    if (section.startNewPage) cursor += 1; // SectionDivider 페이지

    // 섹션 본문 페이지 수 계산 — columnsOverride가 있으면 페이지당 가용 높이 2배
    const effectivePreset = section.columnsOverride
      ? { ...workbook.printPreset, columns: section.columnsOverride }
      : workbook.printPreset;
    const pageHeightLimit = (effectivePreset.columns === 2 ? 2 : 1) * PAGE_CONTENT_HEIGHT;

    let h = 0;
    let pages = 1;
    for (const item of section.items) {
      const ih = estimateItemHeight(item, effectivePreset);
      if (h + ih > pageHeightLimit && h > 0) {
        pages += 1;
        h = ih;
      } else {
        h += ih;
      }
    }
    cursor += pages;
  }

  const tentativeTotal = cursor - 1;

  // TOC 페이지 수
  const tocPageCount = workbook.showToc && sections.length > 0
    ? Math.max(1, Math.ceil(sections.length / TOC_ROWS_PER_PAGE))
    : 0;

  // 2차: TOC 페이지만큼 모든 startPage 시프트
  const sectionStartPages: Record<string, number> = {};
  for (const [id, p] of Object.entries(tentativeStarts)) {
    sectionStartPages[id] = p + tocPageCount;
  }

  return {
    sectionStartPages,
    totalPages: tentativeTotal + tocPageCount,
  };
}
