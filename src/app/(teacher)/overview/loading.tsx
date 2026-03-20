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
    </div>
  );
}
