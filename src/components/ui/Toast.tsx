'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (type: ToastType, message: string, duration?: number) => void;
  remove: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message, duration = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** toast.success('저장 완료'), toast.error('실패') 등 단축 함수 */
export const toast = {
  success: (msg: string, ms?: number) => useToast.getState().add('success', msg, ms),
  error: (msg: string, ms?: number) => useToast.getState().add('error', msg, ms ?? 4000),
  warning: (msg: string, ms?: number) => useToast.getState().add('warning', msg, ms),
  info: (msg: string, ms?: number) => useToast.getState().add('info', msg, ms),
};

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconColors: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

function ToastItem({ item }: { item: ToastItem }) {
  const remove = useToast((s) => s.remove);
  const Icon = icons[item.type];

  useEffect(() => {
    const timer = setTimeout(() => remove(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, remove]);

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-sm border shadow-lg backdrop-blur-sm max-w-sm animate-in slide-in-from-right-full fade-in duration-200 ${styles[item.type]}`}
    >
      <Icon className={`w-4.5 h-4.5 shrink-0 ${iconColors[item.type]}`} />
      <p className="text-sm font-medium flex-1">{item.message}</p>
      <button
        onClick={() => remove(item.id)}
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
