import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer } from '@/components/ui/PageContainer';

export default function SubjectsLoading() {
  return (
    <PageContainer maxWidth="lg">
      {/* PageHeader */}
      <div className="mb-6">
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="flex flex-col gap-8">
        {/* 현재 진행 중 섹션 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="bg-white border-2 border-primary/20 rounded-sm p-6">
            {/* 과정 헤더 */}
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="w-12 h-12 rounded-sm" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-5 w-12 ml-auto" />
                <Skeleton className="h-3 w-8 ml-auto" />
              </div>
            </div>
            {/* 개념 목록 */}
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-sm border border-slate-100">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="w-32 h-2 rounded-full" />
                  <Skeleton className="w-5 h-5 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 다음 과정 섹션 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-sm p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-sm" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-52" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
