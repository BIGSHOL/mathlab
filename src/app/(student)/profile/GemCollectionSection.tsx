import { Gem } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import GemStone from '@/components/gamification/GemStone';
import type { GemVariant } from '@/lib/utils/gem';
import { GEM_VARIANT_LABELS } from '@/lib/utils/gem';

interface GemStat {
  variant: GemVariant;
  total: number;
  completed: number;
  maxStage: number;
}

interface GemCollectionSectionProps {
  gems: GemStat[];
  totalCompleted: number;
  totalInProgress: number;
}

const variantOrder: GemVariant[] = ['ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'quartz'];

export function GemCollectionSection({ gems, totalCompleted, totalInProgress }: GemCollectionSectionProps) {
  // 보석이 하나도 없으면 표시 안 함
  if (gems.every((g) => g.total === 0)) return null;

  const gemMap = new Map(gems.map((g) => [g.variant, g]));

  return (
    <Card className="rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Gem className="w-3.5 h-3.5 text-purple-500" />
          <h2 className="text-sm font-bold text-text-primary">보석 컬렉션</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="font-bold text-purple-600">{totalCompleted}</span>
          <span>완성</span>
          {totalInProgress > 0 && (
            <>
              <span>·</span>
              <span className="font-bold text-amber-600">{totalInProgress}</span>
              <span>진행중</span>
            </>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {variantOrder.map((variant) => {
            const stat = gemMap.get(variant);
            const total = stat?.total ?? 0;
            const completed = stat?.completed ?? 0;
            const maxStage = stat?.maxStage ?? 0;

            return (
              <div
                key={variant}
                className={`flex flex-col items-center p-3 rounded-sm border transition-all ${
                  total > 0
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-slate-50 border-slate-100 opacity-50'
                }`}
              >
                <GemStone
                  variant={variant}
                  stage={total > 0 ? Math.min(maxStage, 4) : 0}
                  size="md"
                />
                <p className="text-xs font-bold text-text-primary mt-1.5">
                  {GEM_VARIANT_LABELS[variant]}
                </p>
                <p className={`text-xs font-extrabold mt-0.5 ${
                  completed > 0 ? 'text-purple-600' : 'text-text-secondary'
                }`}>
                  {completed}/{total}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
