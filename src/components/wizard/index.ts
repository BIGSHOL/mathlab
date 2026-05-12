/**
 * Pattern A — Wizard 컴포넌트 barrel export.
 *
 * 디자인 패턴: design/handoff/02-PAGE-MANIFEST.md § W5 (Pattern A 위자드)
 * 대상 페이지: /solve, /practice/arithmetic/*, /practice/ox/*, /practice/revenge,
 *   /practice/review-test, /exam, /quiz-join, /quiz/[id]/play,
 *   /t/homework, /t/exam, /t/worksheet, /login, /join, /onboarding
 */

export { HomeworkLayout } from './HomeworkLayout';
export type { HomeworkLayoutProps, HomeworkLayoutVariant } from './HomeworkLayout';
