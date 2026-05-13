/**
 * V2 — 상단 가로 progress + 풀스크린 카드 + 떠있는 액션.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V2
 *
 * 권장 사용처 (시안 가이드):
 *   - /tests/create (5단계, 데이터 입력 위주)
 *   - /level-test/create · edit
 *   - /students/enroll (CSV 업로드 → 검증 → 확정)
 *   - /courses/create (기본정보 → 단원 → 학생배정)
 *
 * 슬롯 구조:
 *   topbar (← + 제목 + 취소)
 *   ├ head (단계 제목 + 부제)
 *   ├ progress (가로 진행)
 *   ├ canvas (.wz-v2-card 또는 자유 마크업)
 *   └ bottomBar (sticky — 이전/다음/카운트)
 */
import type { ReactNode } from 'react';
import { WizardTopbar, type WizardTopbarProps } from './WizardTopbar';

export interface WizardLayoutV2Props {
  topbar: WizardTopbarProps;
  /** 단계 제목 (h1) */
  heading: ReactNode;
  /** 단계 부제 */
  subheading?: ReactNode;
  /** 가로 progress 슬롯 (보통 <WizardProgressV2 />) */
  progress: ReactNode;
  /** 작업 영역 — 자유 마크업 또는 <WizardCard /> 래핑 */
  canvas: ReactNode;
  /** 하단 sticky 액션 바 (선택) */
  bottomBar?: ReactNode;
}

export function WizardLayoutV2({
  topbar,
  heading,
  subheading,
  progress,
  canvas,
  bottomBar,
}: WizardLayoutV2Props) {
  return (
    <div className="wz-frame wz-v2">
      <WizardTopbar {...topbar} />
      <div className="wz-v2-head">
        <h1>{heading}</h1>
        {subheading && <p className="sub">{subheading}</p>}
      </div>
      {progress}
      <div className="wz-v2-canvas">{canvas}</div>
      {bottomBar}
    </div>
  );
}
