import { Skeleton } from '@/components/ui/Skeleton';

export default function RankingLoading() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Skeleton className="h-8 w-32 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-sm shadow-soft">
            <Skeleton variant="circle" className="w-8 h-8" />
            <Skeleton variant="circle" className="w-10 h-10" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
