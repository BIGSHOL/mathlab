'use client';

import {
  Loader2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { PdfPageInfo } from '@/types/pdf-extract';

interface PageSelectStepProps {
  pages: PdfPageInfo[];
  selectedPages: Set<number>;
  rangeInput: string;
  setRangeInput: (input: string) => void;
  thumbPage: number;
  setThumbPage: React.Dispatch<React.SetStateAction<number>>;
  THUMBS_PER_PAGE: number;
  togglePage: (pageNum: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  applyRange: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function PageSelectStep({
  pages,
  selectedPages,
  rangeInput,
  setRangeInput,
  thumbPage,
  setThumbPage,
  THUMBS_PER_PAGE,
  togglePage,
  selectAll,
  deselectAll,
  applyRange,
  onBack,
  onNext,
}: PageSelectStepProps) {
  return (
    <div>
      {/* 툴바 */}
      <Card padding="base" className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={selectAll}>
            전체 선택
          </Button>
          <Button variant="secondary" size="sm" onClick={deselectAll}>
            전체 해제
          </Button>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="3-15"
              className="w-20 px-2 py-1 text-sm border border-slate-300 rounded"
              onKeyDown={(e) => e.key === 'Enter' && applyRange()}
            />
            <Button variant="secondary" size="sm" onClick={applyRange}>
              범위 선택
            </Button>
          </div>
          <span className="text-sm text-slate-500 ml-auto">
            <span className="font-semibold text-primary">{selectedPages.size}</span> / {pages.length} 페이지 선택
          </span>
        </div>
      </Card>

      {/* 썸네일 그리드 (페이지네이션) */}
      {(() => {
        const totalThumbPages = Math.ceil(pages.length / THUMBS_PER_PAGE);
        const startIdx = (thumbPage - 1) * THUMBS_PER_PAGE;
        const visiblePages = pages.slice(startIdx, startIdx + THUMBS_PER_PAGE);
        return (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-4">
              {visiblePages.map((page) => {
                const isSelected = selectedPages.has(page.pageNum);
                return (
                  <div
                    key={page.pageNum}
                    onClick={() => togglePage(page.pageNum)}
                    className={`cursor-pointer rounded-sm border-2 transition-all overflow-hidden ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 shadow-md'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {page.thumbnail ? (
                      <img
                        src={page.thumbnail}
                        alt={`페이지 ${page.pageNum}`}
                        className="w-full aspect-[3/4] object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-slate-100 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                      </div>
                    )}
                    <div
                      className={`text-center text-xs py-1 font-medium ${
                        isSelected ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      p.{page.pageNum}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalThumbPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={thumbPage <= 1}
                  onClick={() => setThumbPage((p) => p - 1)}
                >
                  &lsaquo; 이전
                </Button>
                {Array.from({ length: totalThumbPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setThumbPage(p)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      p === thumbPage
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={thumbPage >= totalThumbPages}
                  onClick={() => setThumbPage((p) => p + 1)}
                >
                  다음 &rsaquo;
                </Button>
              </div>
            )}
          </>
        );
      })()}

      {/* 하단 버튼 */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> 이전
        </Button>
        <Button
          onClick={onNext}
          disabled={selectedPages.size === 0}
          className="flex items-center gap-2"
        >
          AI 추출 시작 ({selectedPages.size}페이지) <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
