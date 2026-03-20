'use client';

import { useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { create } from 'zustand';

// ── Zustand 스토어 ──
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: 'danger' | 'warning' | 'info';
  resolve: ((value: boolean) => void) | null;
  show: (opts: ConfirmOptions) => Promise<boolean>;
  close: (result: boolean) => void;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: '확인',
  message: '',
  confirmLabel: '확인',
  cancelLabel: '취소',
  variant: 'danger',
  resolve: null,

  show: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        title: opts.title ?? '확인',
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? '확인',
        cancelLabel: opts.cancelLabel ?? '취소',
        variant: opts.variant ?? 'danger',
        resolve,
      });
    }),

  close: (result) => {
    const { resolve } = get();
    resolve?.(result);
    set({ open: false, resolve: null });
  },
}));

/** 편의 함수: await confirm({ message: '삭제하시겠습니까?' }) */
export const confirm = (opts: ConfirmOptions) => useConfirmStore.getState().show(opts);

// ── 렌더링 컴포넌트 (레이아웃에 1회 배치) ──
export function ConfirmDialog() {
  const { open, title, message, confirmLabel, cancelLabel, variant, close } = useConfirmStore();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    },
    [close],
  );

  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-red-500" />,
      bg: 'bg-red-50',
      btn: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      bg: 'bg-amber-50',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: <AlertTriangle className="w-6 h-6 text-blue-500" />,
      bg: 'bg-blue-50',
      btn: 'bg-primary hover:bg-primary-hover text-white',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={() => close(false)}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
            {style.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 whitespace-pre-line">{message}</p>
          </div>
          <button
            onClick={() => close(false)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={() => close(false)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => close(true)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${style.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
