'use client';

import { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // 0 이하 = 자동 종료 안 함(작업 진행 중 유지)
}

interface ToastStore {
  toasts: ToastItem[];
  /** id 지정 시 기존 토스트 갱신(upsert), 아니면 새로 추가. 생성/갱신된 id 반환 */
  add: (type: ToastType, message: string, duration?: number, id?: string) => string;
  remove: (id: string) => void;
}

// 기본 표시 시간: 10초 후 페이드아웃 (2026-05-29 사용자 요청)
const DEFAULT_DURATION = 10000;
let seq = 0;

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message, duration = DEFAULT_DURATION, id) => {
    const tid = id ?? `t-${++seq}-${Date.now()}`;
    set((s) => {
      if (s.toasts.some((t) => t.id === tid)) {
        // 기존 토스트 갱신 (예: loading → success). duration 바뀌면 ToastItem이 타이머 재설정.
        return { toasts: s.toasts.map((t) => (t.id === tid ? { ...t, type, message, duration } : t)) };
      }
      return { toasts: [...s.toasts, { id: tid, type, message, duration }] };
    });
    return tid;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/**
 * toast.success('저장 완료') 등 단축 함수.
 * - 진행 중 작업: const id = toast.loading('처리 중...'); → 끝나면 toast.success('완료', undefined, id)
 *   (같은 id로 갱신 → loading이 success로 바뀌고 몇 초 후 자동 종료). 실패 시 toast.error(.., undefined, id).
 * - 모든 함수는 toast id를 반환하며, 3번째 인자로 id를 주면 해당 토스트를 갱신한다.
 */
export const toast = {
  success: (msg: string, ms?: number, id?: string) => useToast.getState().add('success', msg, ms, id),
  error: (msg: string, ms?: number, id?: string) => useToast.getState().add('error', msg, ms, id),
  warning: (msg: string, ms?: number, id?: string) => useToast.getState().add('warning', msg, ms, id),
  info: (msg: string, ms?: number, id?: string) => useToast.getState().add('info', msg, ms, id),
  /** 작업 진행 중 유지되는 토스트(자동 종료 안 함). 반환 id로 success/error 갱신 또는 dismiss. */
  loading: (msg: string, id?: string) => useToast.getState().add('loading', msg, 0, id),
  dismiss: (id: string) => useToast.getState().remove(id),
};

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const styles: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  loading: 'bg-slate-50 border-slate-200 text-slate-700',
};

const iconColors: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
  loading: 'text-slate-500',
};

// 페이드아웃 애니메이션 시간 (ms) — 종료 트리거 후 실제 제거까지
const LEAVE_MS = 400;

function ToastItem({ item }: { item: ToastItem }) {
  const remove = useToast((s) => s.remove);
  const [leaving, setLeaving] = useState(false);
  const Icon = icons[item.type];

  // 페이드아웃 시작 → LEAVE_MS 후 실제 제거 (즉시 unmount 대신 부드럽게)
  const startLeave = useCallback(() => {
    setLeaving(true);
    setTimeout(() => remove(item.id), LEAVE_MS);
  }, [item.id, remove]);

  useEffect(() => {
    // duration 0 이하 = 자동 종료 안 함 (loading 등 진행 중 토스트). 갱신으로 duration>0 되면 타이머 시작.
    if (item.duration <= 0) return;
    const timer = setTimeout(startLeave, item.duration);
    return () => clearTimeout(timer);
  }, [item.duration, startLeave]);

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-sm border shadow-lg backdrop-blur-sm max-w-sm transition-all duration-[400ms] ease-out ${
        leaving
          ? 'opacity-0 translate-x-6'
          : 'opacity-100 animate-in slide-in-from-right-full fade-in'
      } ${styles[item.type]}`}
    >
      <Icon className={`w-4.5 h-4.5 shrink-0 ${iconColors[item.type]} ${item.type === 'loading' ? 'animate-spin' : ''}`} />
      <p className="text-sm font-medium flex-1">{item.message}</p>
      <button
        onClick={startLeave}
        className="p-0.5 rounded hover:bg-black/5 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5 opacity-50" />
      </button>
    </div>
  );
}

/** 레이아웃에 한 번만 배치 — 우측 상단에 토스트 표시 */
export function ToastContainer() {
  const toasts = useToast((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 pointer-events-auto">
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} />
      ))}
    </div>
  );
}
