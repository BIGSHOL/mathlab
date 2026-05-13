/**
 * Pattern A — 위자드 빌더 공통 타입.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html
 */

/**
 * 위자드 단계 정의. status 는 currentIndex 와 별개로 props 에서 직접 전달 가능
 * (예: 검증 실패 단계도 'done' 처리 안 함).
 */
export interface WizardStep {
  /** 식별자 — URL 동기화 또는 분석 추적용 */
  id: string;
  /** 단계 제목 (예: "단원 · 범위") */
  label: string;
  /** 단계 부제 (V1 stepper 에서만 표시) */
  sub?: string;
  /** done | active | pending — 명시 안 하면 currentIndex 기준 자동 산출 */
  status?: 'done' | 'active' | 'pending';
}

/** currentIndex 와 steps 로 자동 status 산출 */
export function deriveStepStatus(
  steps: WizardStep[],
  currentIndex: number,
): Required<Pick<WizardStep, 'status'>>[] {
  return steps.map((_, i) => ({
    status: i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending',
  }));
}
