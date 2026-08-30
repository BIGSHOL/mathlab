/**
 * UI 컴포넌트 barrel export.
 *
 * - v1 (Tailwind 기반): Button, Card, ProgressBar, Input, Badge 등
 * - v2 (mathlab-v2.css 기반, design v0.4): ButtonV2, CardV2, ProgressBarV2,
 *   QuestionCard, ChoiceList, OXButtons, TimerRing, HintPanel, ResultCard,
 *   LeaderboardRow, Avatar, Chip, Tier, StatTile, CurrencyChip
 */

// ───── v1 컴포넌트 ─────
export { Button } from './Button';
export { Card } from './Card';
export { Input, SearchInput } from './Input';
export { StatCard } from './StatCard';
export { Badge } from './Badge';
export { ProgressBar } from './ProgressBar';
export { Pagination } from './Pagination';
export { PageHeader } from './PageHeader';
export { LoadingEmptyState } from './LoadingEmptyState';

// ───── v2 디자인 시스템 (data/refact2 design v0.4) ─────
// 충돌 컴포넌트 (V2 suffix)
export { ButtonV2 } from './ButtonV2';
export type { ButtonV2Props } from './ButtonV2';

export { CardV2, CardV2Head } from './CardV2';
export type { CardV2Props } from './CardV2';

export { ProgressBarV2 } from './ProgressBarV2';
export type { ProgressBarV2Props } from './ProgressBarV2';

// v2 전용 컴포넌트 (충돌 없음)
export { Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { Chip } from './Chip';
export type { ChipProps } from './Chip';

export { Tier } from './Tier';
export type { TierProps } from './Tier';

export { StatTile } from './StatTile';
export type { StatTileProps } from './StatTile';

export { CurrencyChip } from './CurrencyChip';
export type { CurrencyChipProps } from './CurrencyChip';

// v2 Practice Suite (B 그룹, Pattern A 위자드용)
export { QuestionCard } from './QuestionCard';
export type { QuestionCardProps, QuestionCardVariant } from './QuestionCard';

export { ChoiceList } from './ChoiceList';
export type { Choice, ChoiceListProps, ChoiceListLayout } from './ChoiceList';

export { OXButtons } from './OXButtons';
export type { OXButtonsProps, OXValue, OXButtonSize } from './OXButtons';

export { TimerRing } from './TimerRing';
export type { TimerRingProps, TimerRingSize } from './TimerRing';

export { HintPanel } from './HintPanel';
export type {
  HintPanelProps,
  Hint,
  HintLevel,
  PreviousAttempt,
  RelatedConcept,
} from './HintPanel';

export { ResultCard } from './ResultCard';
export type { ResultCardProps, ResultCardVariant, ResultCardCTA } from './ResultCard';

export { LeaderboardRow } from './LeaderboardRow';
export type { LeaderboardRowProps, LeaderboardRowVariant } from './LeaderboardRow';
