'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { CoverPage } from '@/components/workbook-print/CoverPage';
import { TocPage } from '@/components/workbook-print/TocPage';
import { SectionDivider } from '@/components/workbook-print/SectionDivider';
import { SectionContentPages, estimateItemHeight } from '@/components/workbook-print/SectionContentPages';
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
}

interface PrintSection {
  id: string;
  title: string;
  description: string | null;
  startNewPage: boolean;
  sortOrder: number;
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

  // 계산이 끝나면 ready 상태로 전환 (다음 frame에서)
  useEffect(() => {
    if (calcState === 'first-render' && payload) {
      // requestAnimationFrame 2번으로 렌더 완료 후 상태 전환
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCalcState('ready'));
      });
    }
  }, [calcState, payload]);

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
  const accentColor = workbook.printPreset.color;
  const tocEntries = sections.map((s) => ({
    sectionId: s.id,
    title: s.title,
    pageNumber: sectionStartPages[s.id] ?? 1,
  }));

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* 인쇄 시 숨김 — 미리보기용 헤더 */}
      <div className="print:hidden sticky top-0 z-30 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
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
        <Button
          variant="primary"
          size="sm"
          onClick={handlePrint}
          disabled={calcState !== 'ready'}
        >
          <Printer className="w-4 h-4 mr-1.5" />
          인쇄
        </Button>
      </div>

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

      {/* 책 본문 */}
      <div className="workbook-print-root max-w-[210mm] mx-auto py-6 print:py-0 print:max-w-none">
        {workbook.showCover && (
          <CoverPage
            title={workbook.title}
            subtitle={workbook.subtitle}
            studentLabel={workbook.studentLabel}
            semesterLabel={workbook.semesterLabel}
            academyName={workbook.academyName}
            ownerName={workbook.ownerName}
            accentColor={accentColor}
          />
        )}

        {workbook.showToc && tocEntries.length > 0 && (
          <TocPage entries={tocEntries} accentColor={accentColor} />
        )}

        {sections.map((section, sIdx) => {
          const startPage = sectionStartPages[section.id] ?? 1;
          return (
            <div key={section.id}>
              {section.startNewPage && (
                <SectionDivider
                  index={sIdx + 1}
                  title={section.title}
                  description={section.description}
                  accentColor={accentColor}
                />
              )}
              <SectionContentPages
                workbookTitle={workbook.title}
                sectionTitle={section.title}
                startPageNumber={section.startNewPage ? startPage + 1 : startPage}
                items={section.items}
                preset={workbook.printPreset}
                isFirstPageOfBook={sIdx === 0 && !workbook.showCover && !workbook.showToc}
              />
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .workbook-print-root { padding: 0 !important; }
        }
      `}</style>
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

    // 섹션 본문 페이지 수 계산
    let h = 0;
    let pages = 1;
    for (const item of section.items) {
      const ih = estimateItemHeight(item, workbook.printPreset);
      if (h + ih > PAGE_CONTENT_HEIGHT && h > 0) {
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
