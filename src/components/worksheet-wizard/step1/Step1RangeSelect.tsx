'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import { GradeSemesterTabs } from './GradeSemesterTabs';
import { CurriculumCheckTree } from './CurriculumCheckTree';
import { QuestionSettingsPanel } from './QuestionSettingsPanel';

interface ChapterCount {
  bookCode: string;
  chapter: string;
  count: number;
}

export function Step1RangeSelect() {
  const { selectedBookCodes } = useWizardStore();
  const [bookCodeCounts, setBookCodeCounts] = useState<Record<string, number>>({});
  const [chapterCounts, setChapterCounts] = useState<ChapterCount[]>([]);

  // 선택된 bookCode별 문제 수 카운트 가져오기
  const fetchCounts = useCallback(async () => {
    if (selectedBookCodes.length === 0) {
      setBookCodeCounts({});
      setChapterCounts([]);
      return;
    }

    try {
      // 각 bookCode별 문제 수
      const results = await Promise.all(
        selectedBookCodes.map(async (bc) => {
          const params = new URLSearchParams({ bookCode: bc, limit: '1' });
          const res = await fetch(`/api/questions?${params}`);
          if (!res.ok) return { bookCode: bc, total: 0, chapters: [] as ChapterCount[] };
          const json = await res.json();
          const total = json.meta?.total ?? 0;
          return { bookCode: bc, total, chapters: [] as ChapterCount[] };
        })
      );

      const counts: Record<string, number> = {};
      for (const r of results) {
        counts[r.bookCode] = r.total;
      }
      setBookCodeCounts(counts);
    } catch {
      // ignore
    }
  }, [selectedBookCodes]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <div className="flex h-full">
      {/* 좌측 — 범위 선택 (60%) */}
      <div className="w-[60%] flex flex-col border-r border-slate-200 bg-white">
        <div className="shrink-0 p-4 pb-3 border-b border-slate-100">
          <GradeSemesterTabs questionCounts={bookCodeCounts} />
        </div>
        <CurriculumCheckTree chapterCounts={chapterCounts} />
      </div>

      {/* 우측 — 설정 (40%) */}
      <div className="w-[40%] bg-slate-50">
        <QuestionSettingsPanel />
      </div>
    </div>
  );
}
