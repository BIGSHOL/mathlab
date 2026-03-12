'use client';

import { DIFFICULTY_LABELS } from '@/types';
import type { QuestionDifficulty } from '@/types';

interface DiffStat {
  difficulty: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface ChapterStat {
  name: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface ReportDifficultyChapterProps {
  difficultyStats: DiffStat[];
  chapterStats: ChapterStat[];
  difficultyComment?: string;
  chapterComment?: string;
}

const DIFF_ORDER: QuestionDifficulty[] = ['BASIC', 'MEDIUM', 'HIGH', 'HIGHEST'];

const DIFF_HEX: Record<string, string> = {
  BASIC: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  HIGHEST: '#ef4444',
};

function getMasteryBadge(accuracy: number): { label: string; bg: string; text: string } {
  if (accuracy >= 80) return { label: 'Master', bg: 'rgba(19,91,236,0.1)', text: '#135bec' };
  if (accuracy >= 60) return { label: 'Growing', bg: '#fef3c7', text: '#d97706' };
  if (accuracy >= 40) return { label: 'Sprout', bg: '#ffedd5', text: '#ea580c' };
  return { label: 'Seed', bg: '#fee2e2', text: '#dc2626' };
}

function getBarColor(accuracy: number): string {
  if (accuracy >= 80) return '#135bec';
  if (accuracy >= 60) return '#d97706';
  return '#ef4444';
}

export function ReportDifficultyChapter({ difficultyStats, chapterStats, difficultyComment, chapterComment }: ReportDifficultyChapterProps) {
  const sortedDiff = DIFF_ORDER
    .map((d) => difficultyStats.find((s) => s.difficulty === d))
    .filter(Boolean) as DiffStat[];

  const totalQuestions = difficultyStats.reduce((s, x) => s + x.total, 0);
  const sortedChapters = [...chapterStats].sort((a, b) => a.accuracy - b.accuracy);
  const gridCols = sortedDiff.length <= 2 ? 'grid-cols-2' : sortedDiff.length === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div className="h-full px-10 py-6 flex flex-col">
      {/* 난이도별 분석 */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#135bec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="12" width="4" height="9" rx="1" />
            <rect x="10" y="7" width="4" height="14" rx="1" />
            <rect x="17" y="3" width="4" height="18" rx="1" />
          </svg>
          <h3 className="text-lg font-bold text-slate-900">난이도별 분석</h3>
        </div>

        <div
          className="rounded-2xl p-5 border border-slate-100"
          style={{ backgroundColor: 'rgba(248,250,252,0.5)', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
        >
          {/* 총 문항수 + 분포 바 */}
          <div className="mb-5">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">문항 분포</p>
                <p className="text-3xl font-black" style={{ color: '#135bec' }}>
                  {totalQuestions} <span className="text-sm font-bold text-slate-400 uppercase">Total</span>
                </p>
              </div>
            </div>

            {/* Stacked Bar */}
            <div className="h-10 w-full flex rounded-xl overflow-hidden bg-slate-200">
              {sortedDiff.map((d) => {
                const pct = totalQuestions > 0 ? (d.total / totalQuestions) * 100 : 0;
                if (pct === 0) return null;
                const showLabel = pct >= 12;
                return (
                  <div
                    key={d.difficulty}
                    className="h-full flex items-center justify-center text-[10px] font-bold text-white border-l border-white/20 first:border-l-0"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: DIFF_HEX[d.difficulty] ?? '#94a3b8',
                      printColorAdjust: 'exact',
                      WebkitPrintColorAdjust: 'exact',
                    } as React.CSSProperties}
                  >
                    {showLabel ? `${DIFFICULTY_LABELS[d.difficulty as QuestionDifficulty] ?? d.difficulty} (${d.total})` : ''}
                  </div>
                );
              })}
            </div>

            {/* 범례 (좁은 세그먼트용) */}
            {sortedDiff.some((d) => (totalQuestions > 0 ? (d.total / totalQuestions) * 100 : 0) < 12) && (
              <div className="flex items-center gap-3 mt-2">
                {sortedDiff.map((d) => {
                  const pct = totalQuestions > 0 ? (d.total / totalQuestions) * 100 : 0;
                  if (pct >= 12 || pct === 0) return null;
                  return (
                    <div key={d.difficulty} className="flex items-center gap-1">
                      <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: DIFF_HEX[d.difficulty], printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
                      />
                      <span className="text-[9px] text-slate-500">
                        {DIFFICULTY_LABELS[d.difficulty as QuestionDifficulty] ?? d.difficulty} ({d.total})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Achievement Cards */}
          <div className={`grid ${gridCols} gap-3`}>
            {sortedDiff.map((d) => (
              <div key={d.difficulty} className="p-3.5 rounded-xl border border-white bg-white">
                <p className="text-xs font-bold text-slate-400 mb-1">
                  {DIFFICULTY_LABELS[d.difficulty as QuestionDifficulty] ?? d.difficulty} 난이도
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black" style={{ color: DIFF_HEX[d.difficulty] }}>{d.accuracy}%</span>
                  <span className="text-[10px] font-bold text-slate-400">성취도</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${d.accuracy}%`,
                      backgroundColor: DIFF_HEX[d.difficulty],
                      printColorAdjust: 'exact',
                      WebkitPrintColorAdjust: 'exact',
                    } as React.CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 멘트 */}
        {difficultyComment && (
          <div
            className="mt-3 rounded-xl p-4 border"
            style={{
              backgroundColor: '#fff7ed',
              borderColor: 'rgba(249,115,22,0.15)',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            } as React.CSSProperties}
          >
            <p className="text-[11px] text-slate-600 leading-relaxed">{difficultyComment}</p>
          </div>
        )}
      </section>

      {/* 단원별 성취도 */}
      <section className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#135bec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <h3 className="text-lg font-bold text-slate-900">단원별 성취도</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="border-b border-slate-100"
                style={{ backgroundColor: '#f8fafc', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
              >
                <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">단원명</th>
                <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">문항수</th>
                <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[35%]">정답률</th>
                <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">평가</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedChapters.map((ch) => {
                const badge = getMasteryBadge(ch.accuracy);
                return (
                  <tr key={ch.name}>
                    <td className="px-5 py-2.5 font-bold text-xs text-slate-900 truncate">{ch.name}</td>
                    <td className="px-5 py-2.5 text-slate-500 text-xs text-center font-medium">{ch.total}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${ch.accuracy}%`,
                              backgroundColor: getBarColor(ch.accuracy),
                              printColorAdjust: 'exact',
                              WebkitPrintColorAdjust: 'exact',
                            } as React.CSSProperties}
                          />
                        </div>
                        <span className="text-xs font-black min-w-[32px] text-right" style={{ color: getBarColor(ch.accuracy) }}>
                          {ch.accuracy}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span
                        className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          printColorAdjust: 'exact',
                          WebkitPrintColorAdjust: 'exact',
                        } as React.CSSProperties}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 멘트 */}
        {chapterComment && (
          <div
            className="mt-3 rounded-xl p-4 border"
            style={{
              backgroundColor: '#eff6ff',
              borderColor: 'rgba(37,99,235,0.15)',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            } as React.CSSProperties}
          >
            <p className="text-[11px] text-slate-600 leading-relaxed">{chapterComment}</p>
          </div>
        )}
      </section>
    </div>
  );
}
