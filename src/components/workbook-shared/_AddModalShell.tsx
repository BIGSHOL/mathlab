'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ShellProps {
  /** 헤더 좌측 아이콘 */
  icon: ReactNode;
  /** 헤더 제목 */
  title: string;
  /** 본문 영역 (검색·필터·결과 리스트 등) */
  children: ReactNode;
  /** 푸터 좌측 안내 텍스트 (선택) */
  footerHint?: string;
  /** 모달 닫기 */
  onClose: () => void;
  /** 푸터 우측 추가 액션 (선택, OX 묶음 모달처럼 "추가" 버튼이 있는 경우) */
  primaryAction?: ReactNode;
  /** 모달 너비 — 'md'(2xl=42rem) | 'lg'(3xl=48rem). 기본 lg */
  size?: 'md' | 'lg';
}

/**
 * 워크북 컨텐츠 추가 모달 공통 셸.
 * 4종 모달(문제/개념/시험지/OX 묶음)의 헤더·푸터·외관을 통일.
 */
export function AddModalShell({
  icon,
  title,
  children,
  footerHint,
  onClose,
  primaryAction,
  size = 'lg',
}: ShellProps) {
  const widthClass = size === 'md' ? 'max-w-2xl' : 'max-w-3xl';
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <Card className={`w-full ${widthClass} max-h-[90vh] flex flex-col p-0 overflow-hidden`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0 bg-white">
          <h3 className="text-base font-bold flex items-center gap-2 text-text-primary">
            <span className="text-text-secondary">{icon}</span>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-sm hover:bg-slate-100 text-text-secondary transition"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 flex flex-col min-h-0 px-5 py-4">
          {children}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 shrink-0 bg-slate-50/50 gap-3">
          <span className="text-xs text-text-secondary truncate">
            {footerHint ?? ' '}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={onClose}>
              닫기
            </Button>
            {primaryAction}
          </div>
        </div>
      </Card>
    </div>
  );
}
