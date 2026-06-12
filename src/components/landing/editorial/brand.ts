/**
 * 브랜드 디자인 토큰 — 공개 표면(랜딩 `/` · 데모 `/demo` · 로그인 `/login`) 크롬 전용.
 *
 * 원천 = para-x 디자인 시스템 (d:\para-x\index.html :root) — 형제 브랜드 시각 통일.
 * Tailwind 유틸 토큰은 globals.css 말미 `--color-brand-*` / `--shadow-brand-*` / `.brand-*` 참조.
 * 잡지(V3) 톤 상수는 ./tokens.ts — 제품 산출물 프리뷰 내부에서만 사용.
 * 앱 내부 토큰과 통합됨(2026-06-12): --color-primary = INDIGO(#4F46E5), --color-background = CREAM.
 */

// ── 색 ──
export const CREAM = '#FBFAF7';        // 크림 (페이지 배경)
export const CREAM_2 = '#F4F2EC';      // 짙은 크림 (스트립/박스 배경)
export const BRAND_INK = '#13142B';    // 잉크 네이비 (헤드라인/다크 밴드)
export const INK_SOFT = '#4B4D6B';     // 본문 보조
export const INK_FAINT = '#8A8CA8';    // 희미한 라벨
export const INDIGO = '#4F46E5';       // 브랜드 인디고
export const VIOLET = '#8B5CF6';
export const CYAN = '#0EA5E9';
export const LINE = 'rgba(19,20,43,0.08)';   // 헤어라인
export const CONSOLE_BG = '#0B1020';   // 라이브 콘솔 다크 배경

// ── 그라데이션 ──
export const GRAD = 'linear-gradient(100deg, #4F46E5 0%, #8B5CF6 50%, #0EA5E9 100%)';
export const GRAD_BTN = 'linear-gradient(100deg, #4F46E5, #7C3AED)';
export const GRAD_DARK_CARD = 'linear-gradient(120deg, #13142B 0%, #1B2350 100%)';

// ── 폰트 ──
export const SANS = "'Pretendard Variable', Pretendard, system-ui, sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
