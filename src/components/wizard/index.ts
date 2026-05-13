/**
 * Pattern A — Wizard 컴포넌트 barrel export.
 *
 * 디자인 패턴: data/refact2/pages/pattern-a-wizard-builder-hifi.html
 * 대상 페이지: /solve, /practice/arithmetic/*, /practice/ox/*, /practice/revenge,
 *   /practice/review-test, /exam, /quiz-join, /quiz/[id]/play,
 *   /t/homework, /t/exam, /t/worksheet, /login, /join, /onboarding
 *
 * 3 변형 셸:
 *   WizardLayoutV1 — 좌측 stepper + 중앙 작업 + 우측 미리보기 (선생님 daily)
 *   WizardLayoutV2 — 상단 가로 progress + 풀스크린 카드 + sticky 액션 (5단계+ 입력)
 *   WizardLayoutV3 — 좌측 입력 + 우측 실시간 시안 (인쇄 산출물)
 *
 * 단계 표시:
 *   WizardStepperV1     — V1 좌측 단계 목록
 *   WizardProgressV2    — V2 가로 진행
 *   WizardMiniStepsV3   — V3 미니 pill
 *
 * 보조:
 *   WizardTopbar     — 공통 상단 바
 *   WizardCard       — V2 작업 카드
 *   WizardBottomBar  — V2 sticky 액션 바
 *
 * 타입:
 *   WizardStep · deriveStepStatus
 *
 * (별도) HomeworkLayout — practice-suite 학생 풀이 셸 (Pattern A V1 단편)
 */

// Pattern A — Wizard 빌더 셸 (W5, 2026-05)
export { WizardLayoutV1, type WizardLayoutV1Props } from './WizardLayoutV1';
export { WizardLayoutV2, type WizardLayoutV2Props } from './WizardLayoutV2';
export { WizardLayoutV3, type WizardLayoutV3Props } from './WizardLayoutV3';

export { WizardStepperV1, type WizardStepperV1Props } from './WizardStepperV1';
export { WizardProgressV2, type WizardProgressV2Props } from './WizardProgressV2';
export { WizardMiniStepsV3, type WizardMiniStepsV3Props } from './WizardMiniStepsV3';

export { WizardTopbar, type WizardTopbarProps } from './WizardTopbar';
export { WizardCard, type WizardCardProps } from './WizardCard';
export { WizardBottomBar, type WizardBottomBarProps } from './WizardBottomBar';

export { type WizardStep, deriveStepStatus } from './types';

// practice-suite (B 그룹, W?) — 학생 풀이 셸 (기존)
export { HomeworkLayout } from './HomeworkLayout';
export type { HomeworkLayoutProps, HomeworkLayoutVariant } from './HomeworkLayout';
