'use client';

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface RowProps {
  /** 상단 메타 라인 — 코드, 학년, 단원, 난이도 등 (작은 텍스트) */
  meta?: ReactNode;
  /** 강조된 제목 또는 본문 */
  title: ReactNode;
  /** 보조 설명 (선택) */
  subtitle?: ReactNode;
  /** 우측 상단 뱃지 (난이도, 문항 수 등) */
  badge?: ReactNode;
  /** 추가 액션 */
  onAdd: () => void;
  /** 추가 진행 중 */
  adding?: boolean;
}

/**
 * 워크북 컨텐츠 추가 모달의 결과 리스트 행.
 * 4개 모달(문제/개념/시험지/OX) 결과 카드를 통일.
 */
export function AddModalRow({ meta, title, subtitle, badge, onAdd, adding }: RowProps) {
  return (
    <li className="flex items-start gap-3 p-3 border border-slate-200 rounded-sm bg-white hover:border-primary/40 hover:shadow-sm transition">
      <div className="flex-1 min-w-0">
        {(meta || badge) && (
          <div className="flex items-center gap-2 text-[11px] text-text-secondary mb-1.5 min-h-[1rem]">
            <div className="flex items-center gap-1.5 min-w-0 truncate">{meta}</div>
            {badge && <div className="ml-auto shrink-0">{badge}</div>}
          </div>
        )}
        <div className="text-sm font-semibold text-text-primary break-words">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-text-secondary mt-1 break-words">
            {subtitle}
          </div>
        )}
      </div>
      <Button size="sm" variant="primary" onClick={onAdd} loading={adding} className="shrink-0">
        <Plus className="w-3.5 h-3.5" />
        추가
      </Button>
    </li>
  );
}

interface MetaTagProps {
  children: ReactNode;
  variant?: 'code' | 'plain' | 'badge';
}

/** 메타 라인의 작은 라벨 — code(고정폭) / plain(텍스트) / badge(배경색) */
export function MetaTag({ children, variant = 'plain' }: MetaTagProps) {
  if (variant === 'code') {
    return (
      <span className="font-mono text-[11px] text-slate-500 shrink-0">
        {children}
      </span>
    );
  }
  if (variant === 'badge') {
    return (
      <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 text-[10px] font-semibold shrink-0">
        {children}
      </span>
    );
  }
  return <span className="text-[11px] text-text-secondary truncate">{children}</span>;
}

export function MetaSep() {
  return <span className="text-slate-300 text-[10px] shrink-0">·</span>;
}
