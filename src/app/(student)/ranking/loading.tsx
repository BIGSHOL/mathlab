import { Skeleton } from '@/components/ui/Skeleton';

export default function RankingLoading() {
  return (
    <div className="w-full mx-auto px-4 md:px-8 py-6 md:py-8 max-w-[1200px]">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-10 h-10 rounded-sm" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      {/* 포디움 */}
      <div className="flex items-end justify-center gap-5 mb-6">
        <div className="flex flex-col items-center w-[160px]">
          <Skeleton variant="circle" className="w-14 h-14 mb-2" />
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-3 w-12 mb-2" />
          <Skeleton className="w-full h-[130px] rounded-t-lg" />
        </div>
        <div className="flex flex-col items-center w-[160px]">
          <Skeleton variant="circle" className="w-20 h-20 mb-2" />
          <Skeleton className="h-5 w-20 mb-1" />
          <Skeleton className="h-3 w-14 mb-2" />
          <Skeleton className="w-full h-[160px] rounded-t-lg" />
        </div>
        <div className="flex flex-col items-center w-[160px]">
          <Skeleton variant="circle" className="w-14 h-14 mb-2" />
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-3 w-12 mb-2" />
          <Skeleton className="w-full h-[110px] rounded-t-lg" />
        </div>
      </div>

      {/* 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 리스트 */}
        <div className="lg:col-span-2 space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-sm">
              <Skeleton className="w-8 h-6 rounded" />
              <Skeleton className="w-8 h-4 rounded" />
              <Skeleton variant="circle" className="w-10 h-10" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>

        {/* 인사이트 */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <Skeleton className="h-5 w-20 mb-3" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Skeleton variant="circle" className="w-7 h-7" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <Skeleton className="h-5 w-20 mb-3" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Skeleton variant="circle" className="w-7 h-7" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <Skeleton className="h-5 w-24 mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-sm" />
              <Skeleton className="h-16 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
