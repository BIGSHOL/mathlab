import { Skeleton, SkeletonStatCard, SkeletonCard, SkeletonListItem } from '@/components/ui/Skeleton';

export default function OverviewLoading() {
  return (
    <div className="flex flex-col grow min-w-0 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8 gap-3">
      {/* 헤더 */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded-sm" />
      </div>

      {/* 통계 카드 4열 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* 차트 + 집중관리 학생 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <SkeletonCard lines={2} />
          <Skeleton className="h-40 mt-3 rounded-sm" />
        </div>
        <div className="lg:col-span-2 space-y-2">
          <Skeleton className="h-5 w-32 mb-2" />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </div>
      </div>

      {/* Row 2.5: 주간 분석 (DashboardAnalytics) */}
      <div className="bg-white border border-slate-200 rounded-sm p-5">
        <div className="flex justify-between items-center mb-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-40 rounded-sm" />
      </div>

      {/* Row 3: 3열 하단 (랭킹 + 학년분포 + 최근활동) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, j) => (
                <div key={j} className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
                  <Skeleton variant="circle" className="w-6 h-6 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
