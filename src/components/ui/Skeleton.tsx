'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
  count?: number;
}

/** 스켈레톤 로딩 프리미티브 — animate-pulse 기반 */
export function Skeleton({ className = '', variant = 'rect', count = 1 }: SkeletonProps) {
  if (variant === 'circle') {
    return <div className={`animate-pulse rounded-full bg-slate-200 ${className}`} />;
  }

  if (variant === 'text' && count > 1) {
    const widths = ['w-full', 'w-[85%]', 'w-[70%]', 'w-[90%]', 'w-[60%]'];
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`animate-pulse h-4 bg-slate-200 rounded ${widths[i % widths.length]}`} />
        ))}
      </div>
    );
  }

  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

/** StatCard 형태 스켈레톤 */
export function SkeletonStatCard() {
  return (
    <div className="glass-card flex flex-col gap-2 rounded-sm p-3 shadow-sm relative overflow-hidden">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-24 mt-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

/** 리스트 행 스켈레톤 */
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-sm bg-slate-50 border border-slate-100">
      <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** 카드형 스켈레톤 */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-soft space-y-3">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton variant="text" count={lines} />
    </div>
  );
}
