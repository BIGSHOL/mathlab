'use client';

import * as React from 'react';
import { ProgressBarV2 } from '@/components/ui';

export type HomeworkLayoutVariant = 'split' | 'single';

export type HomeworkLayoutProps = {
  /** 상단 제목 (예: "연산 숙제 — 일차방정식") */
  title: string;
  /** 현재 문항 번호 (1-base) */
  current: number;
  /** 전체 문항 수 */
  total: number;
  correct?: number;
  wrong?: number;
  /** 좌측 (메인) 콘텐츠 */
  left: React.ReactNode;
  /** 우측 사이드 패널. variant='single' 이면 무시 */
  right?: React.ReactNode;
  onClose?: () => void;
  onSubmit?: () => void;
  onSaveDraft?: () => void;
  /** Footer 에 표시할 추가 버튼 (예: 다음 버튼) */
  footerExtra?: React.ReactNode;
  /** 'split' (좌우 분할) | 'single' (1열, A2 OX) */
  variant?: HomeworkLayoutVariant;
  /** 제출 버튼 라벨 (기본 "제출") */
  submitLabel?: string;
  className?: string;
};

/**
 * v2 디자인 시스템 HomeworkLayout.
 * practice-suite.css 의 .v2-hw-layout / .v2-hw-head / .v2-hw-body / .v2-hw-foot 매핑.
 *
 * 구조:
 *   header: 닫기 + 제목 + ProgressBar(current/total) + 정답/오답 카운터
 *   body  : split → left(1fr) + right(320px), single → left(720 max)
 *   footer: onSubmit / onSaveDraft / footerExtra
 *
 * 모바일 (~900px): body 자동으로 1열 (right 가 아래로)
 */
export function HomeworkLayout({
  title,
  current,
  total,
  correct,
  wrong,
  left,
  right,
  onClose,
  onSubmit,
  onSaveDraft,
  footerExtra,
  variant = 'split',
  submitLabel = '제출',
  className,
}: HomeworkLayoutProps) {
  const layoutClasses = ['v2-hw-layout'];
  if (className) layoutClasses.push(className);

  const bodyClasses = ['v2-hw-body'];
  if (variant === 'single' || !right) bodyClasses.push('single');

  const showFooter = !!(onSubmit || onSaveDraft || footerExtra);

  return (
    <div className={layoutClasses.join(' ')}>
      <header className="v2-hw-head">
        {onClose && (
          <button
            type="button"
            className="v2-hw-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        )}
        <h1 className="v2-hw-title">{title}</h1>
        <div className="v2-hw-pbar">
          <ProgressBarV2 value={current} max={total} size="md" showLabel />
        </div>
        <div className="v2-hw-meta">
          {correct != null && <span className="ok">정답 {correct}</span>}
          {wrong != null && <span className="ng">오답 {wrong}</span>}
        </div>
      </header>

      <main className={bodyClasses.join(' ')}>
        <section className="v2-hw-left">{left}</section>
        {variant !== 'single' && right && <aside className="v2-hw-right">{right}</aside>}
      </main>

      {showFooter && (
        <footer className="v2-hw-foot">
          {footerExtra}
          {onSaveDraft && (
            <button type="button" className="btn" onClick={onSaveDraft}>
              임시저장
            </button>
          )}
          {onSubmit && (
            <button type="button" className="btn primary" onClick={onSubmit}>
              {submitLabel}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
