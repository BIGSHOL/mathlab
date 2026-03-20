'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Student Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          문제가 발생했습니다
        </h2>
        <p className="text-slate-500 text-sm">
          일시적인 오류가 발생했습니다. 다시 시도하거나 대시보드로 이동해주세요.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            다시 시도
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            <Home className="w-4 h-4" />
            대시보드
          </Link>
        </div>
      </div>
    </div>
  );
}
