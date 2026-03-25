'use client';

interface ReportPageWrapperProps {
  children: React.ReactNode;
  pageNumber: number;
  totalPages: number;
  studentName?: string;
  testTitle?: string;
  testDate?: string;
  /** 표지에는 헤더/푸터 숨김 */
  showHeader?: boolean;
}

export function ReportPageWrapper({
  children,
  pageNumber,
  totalPages,
  studentName,
  testTitle,
  testDate,
  showHeader = true,
}: ReportPageWrapperProps) {
  return (
    <div className="flex flex-col h-full w-full relative">
      {/* 헤더 */}
      {showHeader && (
        <div className="shrink-0 flex items-center justify-between px-10 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 flex items-center justify-center text-white rounded-md"
              style={{ backgroundColor: '#135bec', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
            >
              <svg width="14" height="14" viewBox="0 0 48 48" fill="currentColor">
                <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" />
              </svg>
            </div>
            <span className="text-xs font-black tracking-tight text-slate-900 italic">MathLab</span>
            {testTitle && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500 font-medium">{testTitle}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {studentName && <span className="text-xs font-bold text-slate-700">{studentName}</span>}
            {testDate && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">{testDate}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 본문 */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* 푸터 */}
      {showHeader && (
        <div className="shrink-0 flex items-center justify-between px-10 py-2 border-t border-slate-100">
          <span className="text-[9px] text-slate-400 font-medium">AI Diagnostic Report</span>
          <span className="text-[9px] text-slate-400 tabular-nums font-bold">
            {pageNumber} / {totalPages}
          </span>
          <span className="text-[9px] text-slate-300">© MathLab</span>
        </div>
      )}
    </div>
  );
}
