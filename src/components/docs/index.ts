/**
 * Pattern G — 정적 문서 컴포넌트 barrel export.
 *
 * 디자인 패턴: design/handoff/02-PAGE-MANIFEST.md § W2 (Pattern G)
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html
 *
 * 대상 페이지:
 *   - 1.2 /help, /help-popup (V1 도움말)
 *   - 1.3 /terms, /privacy (V2 약관)
 *   - 1.4 /admin/announcements (V3 릴리즈)
 */

// V1 도움말 모드
export { DocsLayout } from './DocsLayout';
export type { DocsLayoutProps } from './DocsLayout';

export { DocsToc } from './DocsToc';
export type { DocsTocProps, DocsTocGroup, DocsTocItem } from './DocsToc';

export { Callout } from './Callout';
export type { CalloutProps, CalloutType } from './Callout';

export { AnchorNav } from './AnchorNav';
export type { AnchorNavProps, AnchorNavItem, AnchorNavFeedback } from './AnchorNav';

// V2 약관·정책 모드
export { LegalDoc } from './LegalDoc';
export type {
  LegalDocProps,
  LegalDocData,
  LegalSection,
  LegalOrderedItem,
  LegalVersion,
} from './LegalDoc';

// V3 릴리즈 노트 모드
export { ReleaseNotes } from './ReleaseNotes';
export type {
  ReleaseNotesProps,
  Release,
  ReleaseChangeGroup,
  ReleaseChangeItem,
  ReleaseChangeType,
  ReleaseVersionLevel,
  ReleaseFilterType,
} from './ReleaseNotes';
