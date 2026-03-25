import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer } from '@/components/ui/PageContainer';

export default function ProfileLoading() {
  return (
    <PageContainer maxWidth="lg">
      <div className="flex flex-col gap-6">
        {/* 상단: 프로필 헤더 & 학습 스트릭 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
          {/* 프로필 정보 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton variant="circle" className="w-14 h-14 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            </div>
            {/* 미니 통계 4개 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-50">
                  <Skeleton className="w-3.5 h-3.5 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-8" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 학습 스트릭 */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-1.5 bg-slate-50/50">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-5 mb-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-3 w-12 mb-1.5" />
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <Skeleton className="w-full aspect-square rounded-md" />
                    <Skeleton className="h-2 w-4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 보석 컬렉션 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </div>

        {/* 2×2 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-3.5 h-3.5 rounded" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="p-3 space-y-1">
                {Array.from({ length: 4 }, (_, j) => (
                  <div key={j} className="flex items-center gap-2 px-2.5 py-2 rounded-md">
                    <Skeleton className="w-6 h-6 rounded shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-3 w-10 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 뱃지 보관함 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="flex flex-col items-center p-2 rounded-xl border border-slate-100 h-[114px] justify-center">
                <Skeleton variant="circle" className="w-10 h-10 mb-1.5" />
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
