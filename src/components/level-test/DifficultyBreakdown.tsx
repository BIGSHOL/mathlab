'use client';

import { DIFFICULTY_LABELS } from '@/types';

interface DifficultyStatItem {
  difficulty: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface DifficultyBreakdownProps {
  stats: DifficultyStatItem[];
}

const DIFFICULTY_STYLES: Record<string, { bar: string; bg: string; text: string }> = {
  BASIC: { bar: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  MEDIUM: { bar: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  HIGH: { bar: 'bg-rose-400', bg: 'bg-rose-50', text: 'text-rose-700' },
  HIGHEST: { bar: 'bg-purple-400', bg: 'bg-purple-50', text: 'text-purple-700' },
};

/**
 * 난이도별 분석 - 수평 바 차트
 * 경쟁사의 도넛차트 대신, 깔끔한 수평 바로 차별화
 */
export function DifficultyBreakdown({ stats }: DifficultyBreakdownProps) {
  const totalQuestions = stats.reduce((sum, s) => sum + s.total, 0);
  if (totalQuestions === 0) return null;

  return (
    <div className="space-y-3">
      {/* 분포 비율 바 (전체를 하나의 stacked bar로) */}
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
        {stats
          .filter((s) => s.total > 0)
          .map((s) => {
            const pct = (s.total / totalQuestions) * 100;
            const style = DIFFICULTY_STYLES[s.difficulty];
            return (
              <div
                key={s.difficulty}
                className={`${style?.bar ?? 'bg-slate-300'} transition-all duration-500`}
                style={{ width: `${pct}%` }}
                title={`${DIFFICULTY_LABELS[s.difficulty as keyof typeof DIFFICULTY_LABELS] ?? s.difficulty}: ${s.total}문제`}
              />
            );
          })}
      </div>

      {/* 난이도별 상세 */}
      <div className="space-y-2">
        {stats.map((s) => {
          const style = DIFFICULTY_STYLES[s.difficulty] ?? { bar: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-700' };
          const label = DIFFICULTY_LABELS[s.difficulty as keyof typeof DIFFICULTY_LABELS] ?? s.difficulty;
          return (
            <div key={s.difficulty} className="flex items-center gap-3">
              <span className={`text-xs font-bold w-8 shrink-0 ${style.text}`}>{label}</span>
              <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
                  style={{ width: `${s.accuracy}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                  {s.accuracy}%
                </span>
              </div>
              <span className="text-xs text-slate-500 shrink-0 w-10 text-right">{s.correct}/{s.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
