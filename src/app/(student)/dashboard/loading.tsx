import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="px-4 md:px-8 py-8 w-full">
      {/* 숙제 배너 (최대 3개) */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-[60px] rounded-xl" />
        <Skeleton className="h-[60px] rounded-xl" />
      </div>

      {/* 환영 헤더 + XP 뱃지 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>

      {/* 학습 과정 배너 */}
      <Skeleton className="h-[68px] rounded-xl mb-6" />

      {/* 통계 카드 4열 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="w-4 h-4 rounded" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>

      {/* Row 1: 진행 중인 학습 (2/3) + 추천 학습/게이미피케이션 (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-[100px] rounded-md shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {/* 추천 학습 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-1.5 last:mb-0">
                <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          {/* 게이미피케이션 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <Skeleton className="h-4 w-20 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 최근 오답 + 주간 학습 (2열) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* 최근 오답 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-1.5 last:mb-0">
              <Skeleton className="w-3.5 h-3.5 rounded shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="shrink-0 space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* 주간 학습 차트 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-end justify-between gap-2 flex-1 min-h-[140px]">
            {[30, 50, 20, 70, 40, 60, 45].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full max-w-[28px] rounded-t-lg animate-pulse bg-slate-200" style={{ height: `${h}%` }} />
                <Skeleton className="h-3 w-full max-w-[36px]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: 랭킹 (전체 너비) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex-1 min-w-[140px] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <Skeleton className="h-5 w-4" />
              <Skeleton variant="circle" className="w-8 h-8 shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
