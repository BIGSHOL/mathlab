'use client';

import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * 기출분석 전용 모드에서 사이드바가 숨겨진 사용자를 위한 우측 상단 미니 바.
 * 사용자 이름 + 로그아웃 버튼만 노출.
 */
export function ExamOnlyTopBar() {
  const { user, logout } = useAuth();

  return (
    <div className="fixed top-3 right-4 z-50 flex items-center gap-2 bg-white border border-slate-200 rounded-full shadow-sm px-3 py-1.5 print:hidden">
      <User className="w-3.5 h-3.5 text-slate-400" />
      <span className="text-sm text-slate-700 font-medium">
        {user?.name ?? user?.username ?? '사용자'}
      </span>
      <button
        onClick={() => logout?.()}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 border-l border-slate-200 pl-2 ml-1 transition-colors"
        title="로그아웃"
      >
        <LogOut className="w-3.5 h-3.5" />
        로그아웃
      </button>
    </div>
  );
}
