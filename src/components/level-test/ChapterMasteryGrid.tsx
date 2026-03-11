'use client';

import { Sprout, Leaf, TreePine, Award } from 'lucide-react';

interface ChapterStat {
  name: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface ChapterMasteryGridProps {
  chapters: ChapterStat[];
}

/**
 * 단원별 마스터리 시각화
 * 경쟁사의 신호등 대신 "성장 단계" 메타포 사용:
 * 🌱 씨앗(< 40%) → 🌿 새싹(40-59%) → 🌲 성장(60-79%) → 🏆 마스터(80%+)
 */

function getMasteryLevel(accuracy: number) {
  if (accuracy >= 80) return { level: '마스터', icon: Award, color: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-500', border: 'border-indigo-200' };
  if (accuracy >= 60) return { level: '성장', icon: TreePine, color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', border: 'border-emerald-200' };
  if (accuracy >= 40) return { level: '새싹', icon: Leaf, color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-400', border: 'border-amber-200' };
  return { level: '씨앗', icon: Sprout, color: 'text-red-500', bg: 'bg-red-50', bar: 'bg-red-400', border: 'border-red-200' };
}

export function ChapterMasteryGrid({ chapters }: ChapterMasteryGridProps) {
  if (chapters.length === 0) return null;

  const sorted = [...chapters].sort((a, b) => b.accuracy - a.accuracy);

  return (
    <div className="space-y-1.5">
      {sorted.map((ch) => {
        const mastery = getMasteryLevel(ch.accuracy);
        const Icon = mastery.icon;

        return (
          <div key={ch.name} className={`flex items-center gap-2.5 rounded-sm px-3 py-2 ${mastery.bg} border ${mastery.border}`}>
            <Icon className={`w-4 h-4 shrink-0 ${mastery.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-slate-700 truncate">{ch.name}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={`text-[10px] font-bold ${mastery.color}`}>{mastery.level}</span>
                  <span className="text-[10px] text-slate-500">{ch.correct}/{ch.total}</span>
                </div>
              </div>
              {/* 4-segment mastery bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden bg-white/60 gap-px">
                {[40, 60, 80, 100].map((threshold, i) => {
                  const segStart = [0, 40, 60, 80][i];
                  const segEnd = threshold;
                  const segWidth = segEnd - segStart;
                  const fillPct = ch.accuracy <= segStart ? 0
                    : ch.accuracy >= segEnd ? 100
                    : ((ch.accuracy - segStart) / (segEnd - segStart)) * 100;
                  return (
                    <div key={threshold} className="bg-white/40 rounded-sm overflow-hidden" style={{ flex: segWidth }}>
                      <div
                        className={`h-full ${mastery.bar} transition-all duration-500`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <span className={`text-sm font-black tabular-nums shrink-0 ${mastery.color}`}>
              {ch.accuracy}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
