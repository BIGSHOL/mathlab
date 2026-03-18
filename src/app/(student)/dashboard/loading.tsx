import { Skeleton, SkeletonStatCard, SkeletonListItem, SkeletonCard } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* 숙제 배너 스켈레톤 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-sm" />
        ))}
      </div>

      {/* 통계 카드 4열 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* 메인 콘텐츠 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SkeletonCard lines={4} />
        </div>
        <div className="space-y-3">
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </div>
      </div>

      {/* 하단 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Skeleton className="h-48 rounded-sm" />
        </div>
        <SkeletonCard lines={3} />
      </div>
    </div>
  );
}
