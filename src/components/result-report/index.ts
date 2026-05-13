/**
 * Pattern B — 결과 리포트 컴포넌트 barrel.
 *
 * 디자인 패턴: data/refact2/handoff/02-PAGE-MANIFEST.md § W4 (Pattern B)
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1
 *
 * 대상 페이지:
 *   - 3.1 /my-tests/[id]/result (V1, 시범)
 *   - 3.2 /diagnostics/[id]/result (V1)
 *   - 3.3 /market (V1 지갑 변형 — 추후)
 *   - 3.4 /me, /profile (V1 + 히스토리)
 *   - 3.5 /dashboard (V3 게임 HUD — 추후)
 *   - 3.6 /t/analytics (V1 대시보드)
 */

export { ResultReportLayout } from './ResultReportLayout';
export type { ResultReportLayoutProps } from './ResultReportLayout';

export { HeroScore } from './HeroScore';
export type { HeroScoreProps, HeroScoreMeta } from './HeroScore';

export { KpiGrid } from './KpiGrid';
export type { KpiGridProps, KpiItem } from './KpiGrid';

export { UnitBars } from './UnitBars';
export type { UnitBarsProps, UnitAccuracy } from './UnitBars';

export { WrongList } from './WrongList';
export type { WrongListProps, WrongItem } from './WrongList';

export { AICommentary } from './AICommentary';
export type { AICommentaryProps } from './AICommentary';

export { RewardBox } from './RewardBox';
export type { RewardBoxProps, RewardItem } from './RewardBox';

export { NextActions } from './NextActions';
export type { NextActionsProps, NextAction } from './NextActions';
