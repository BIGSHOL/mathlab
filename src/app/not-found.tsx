'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-slate-50">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        {/* 404 숫자 */}
        <div className="relative">
          <span className="text-[120px] font-black text-slate-100 leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-black text-primary">404</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          <br />
          주소를 다시 확인하거나 아래 버튼을 이용해주세요.
        </p>

        <div className="flex gap-3 mt-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-sm hover:bg-primary-hover transition-colors text-sm font-medium"
          >
            <Home className="w-4 h-4" />
            홈으로 이동
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-sm hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            이전 페이지
          </button>
        </div>
      </div>
    </div>
  );
}
