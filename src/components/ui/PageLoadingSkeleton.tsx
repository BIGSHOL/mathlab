import { Skeleton } from './Skeleton';

interface PageLoadingSkeletonProps {
  /** 레이아웃 변형 */
  variant?: 'detail' | 'list' | 'form' | 'result' | 'grid';
  /** 추가 클래스 */
  className?: string;
}

/**
 * 페이지 전체 로딩 스켈레톤 — Loader2 스피너 대체용
 * 페이지 레이아웃에 맞는 variant를 선택하여 사용
 */
export function PageLoadingSkeleton({ variant = 'detail', className = '' }: PageLoadingSkeletonProps) {
  return (
    <div className={`w-full px-4 md:px-8 py-6 md:py-8 ${className}`}>
      {variant === 'detail' && <DetailSkeleton />}
      {variant === 'list' && <ListSkeleton />}
      {variant === 'form' && <FormSkeleton />}
      {variant === 'result' && <ResultSkeleton />}
      {variant === 'grid' && <GridSkeleton />}
    </div>
  );
}

/** 상세 페이지: 헤더 + 본문 콘텐츠 */
function DetailSkeleton() {
  return (
    <>
      {/* 뒤로가기 + 제목 */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      {/* 본문 카드 */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[75%]" />
        <Skeleton className="h-32 w-full rounded-lg mt-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-4 w-[60%]" />
      </div>
    </>
  );
}

/** 리스트 페이지: 헤더 + 검색 + 항목 목록 */
function ListSkeleton() {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl">
            <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </>
  );
}

/** 폼/생성 페이지: 헤더 + 입력 필드 */
function FormSkeleton() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-3xl">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </>
  );
}

/** 결과 페이지: 점수 + 통계 + 문제 목록 */
function ResultSkeleton() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-7 w-36" />
      </div>
      {/* 점수 요약 카드 */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-center gap-8">
          <div className="text-center space-y-2">
            <Skeleton className="h-12 w-20 mx-auto" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
          <Skeleton className="h-16 w-px" />
          <div className="flex gap-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="text-center space-y-1.5">
                <Skeleton className="h-6 w-10 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* 문제 목록 */}
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Skeleton className="h-9 rounded-lg" />
                  <Skeleton className="h-9 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** 그리드 페이지: 헤더 + 그리드 카드 */
function GridSkeleton() {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex justify-between items-center pt-1">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
