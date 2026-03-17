'use client';

import { Calendar, Download } from 'lucide-react';

export function OverviewActions() {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => window.print()}
        className="flex items-center rounded-sm bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-slate-50 transition-all shadow-sm"
      >
        <Calendar className="w-4 h-4 mr-1.5" />
        기간 설정
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center rounded-sm bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-all shadow-md"
      >
        <Download className="w-4 h-4 mr-1.5" />
        리포트 다운로드
      </button>
    </div>
  );
}
