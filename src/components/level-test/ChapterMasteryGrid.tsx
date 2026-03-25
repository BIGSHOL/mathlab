'use client';

interface ChapterStat {
  name: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface ChapterMasteryGridProps {
  chapters: ChapterStat[];
}

function getMasteryColor(accuracy: number) {
  if (accuracy >= 80) return { bar: 'bg-indigo-500', text: 'text-indigo-600', label: '마스터' };
  if (accuracy >= 60) return { bar: 'bg-emerald-500', text: 'text-emerald-600', label: '성장' };
  if (accuracy >= 40) return { bar: 'bg-amber-400', text: 'text-amber-600', label: '새싹' };
  return { bar: 'bg-red-400', text: 'text-red-500', label: '씨앗' };
}

export function ChapterMasteryGrid({ chapters }: ChapterMasteryGridProps) {
  if (chapters.length === 0) return null;

  const sorted = [...chapters].sort((a, b) => b.accuracy - a.accuracy);

  return (
    <div className="space-y-1">
      {sorted.map((ch) => {
        const m = getMasteryColor(ch.accuracy);
        return (
          <div key={ch.name} className="flex items-center gap-2 py-1">
            <span className="text-xs text-slate-700 truncate w-36 shrink-0">{ch.name}</span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${m.bar}`}
                style={{ width: `${Math.min(ch.accuracy, 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 shrink-0 w-8 text-right">{ch.correct}/{ch.total}</span>
            <span className={`text-xs font-bold tabular-nums shrink-0 w-9 text-right ${m.text}`}>
              {ch.accuracy}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
