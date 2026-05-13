/**
 * Pattern A 공통 topbar — V1/V2/V3 어디서나 동일.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § 공통 topbar
 *
 * 좌측: ← + 제목 + (선택) step-text
 * 우측: 액션 슬롯 (이전 / 다음 / 임시저장 / 취소 등)
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface WizardTopbarProps {
  /** 뒤로가기 href (예: 시험 목록). 미지정 시 ← 표시 안 함. */
  backHref?: string;
  /** 뒤로가기 라벨 (예: "← 숙제 목록"). backHref 와 함께 사용. */
  backLabel?: string;
  /** 제목 (예: "새 숙제 — 단계 2/4") */
  title: ReactNode;
  /** 제목 옆 부가 텍스트 (예: "· 문제 선택") */
  stepText?: ReactNode;
  /** 우측 액션 영역 */
  actions?: ReactNode;
}

export function WizardTopbar({
  backHref,
  backLabel,
  title,
  stepText,
  actions,
}: WizardTopbarProps) {
  return (
    <div className="wz-topbar">
      {backHref && (
        <Link className="back" href={backHref}>
          {backLabel ?? '←'}
        </Link>
      )}
      <span className="title">{title}</span>
      {stepText && <span className="step-text">{stepText}</span>}
      <span className="sp" />
      {actions}
    </div>
  );
}
