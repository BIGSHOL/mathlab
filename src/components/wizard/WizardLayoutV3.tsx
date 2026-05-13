/**
 * V3 — 좌측 입력(340) + 우측 실시간 시안(1fr).
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V3
 *
 * 권장 사용처 (시안 가이드):
 *   - teacher-worksheet (학습지) — 인쇄 산출물 즉시 확인
 *
 * 슬롯 구조:
 *   topbar (← + 제목 + PDF/인쇄)
 *   ├ input (좌측 340px — 미니 step + 설정 폼)
 *   └ preview (우측 1fr — 실시간 시안 미리보기)
 */
import type { ReactNode } from 'react';
import { WizardTopbar, type WizardTopbarProps } from './WizardTopbar';

export interface WizardLayoutV3Props {
  topbar: WizardTopbarProps;
  /** 좌측 입력 영역 — 미니 step + 설정 sections */
  input: ReactNode;
  /** 우측 실시간 미리보기 */
  preview: ReactNode;
  /** 우측 미리보기 헤더 (기본 "실시간 미리보기") */
  previewLabel?: ReactNode;
}

export function WizardLayoutV3({
  topbar,
  input,
  preview,
  previewLabel = '실시간 미리보기',
}: WizardLayoutV3Props) {
  return (
    <div className="wz-frame">
      <WizardTopbar {...topbar} />
      <div className="wz-v3">
        <div className="wz-v3-input">{input}</div>
        <div className="wz-v3-preview">
          <h4>{previewLabel}</h4>
          {preview}
        </div>
      </div>
    </div>
  );
}
