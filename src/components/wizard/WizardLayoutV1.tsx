/**
 * V1 — 좌측 stepper + 중앙 작업 + 우측 미리보기.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V1
 *
 * 권장 사용처 (시안 가이드):
 *   - /homework/create (선생님 daily 워크플로우, 미리보기 항상 우측)
 *   - /homework/concept-create · /question-create
 *
 * 슬롯 구조:
 *   topbar (← + 제목 + 액션)
 *   ├ stepper (좌측 260px)
 *   ├ canvas  (중앙 1fr · 스크롤)
 *   └ preview (우측 320px · 스크롤)
 */
import type { ReactNode } from 'react';
import { WizardTopbar, type WizardTopbarProps } from './WizardTopbar';

export interface WizardLayoutV1Props {
  topbar: WizardTopbarProps;
  /** 좌측 단계 목록 (보통 <WizardStepperV1 />) */
  stepper: ReactNode;
  /** 중앙 작업 영역 — 현재 단계의 입력 폼 */
  canvas: ReactNode;
  /** 우측 미리보기 (선택). 반응형 (≤1100px) 에서 자동 숨김. */
  preview?: ReactNode;
}

export function WizardLayoutV1({
  topbar,
  stepper,
  canvas,
  preview,
}: WizardLayoutV1Props) {
  return (
    <div className="wz-frame">
      <WizardTopbar {...topbar} />
      <div className="wz-v1">
        {stepper}
        <div className="wz-v1-canvas">{canvas}</div>
        {preview && <aside className="wz-v1-preview">{preview}</aside>}
      </div>
    </div>
  );
}
