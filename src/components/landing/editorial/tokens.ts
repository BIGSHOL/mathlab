/**
 * 에디토리얼(V3) 디자인 토큰 — 공개 표면(랜딩 `/` · 데모 `/demo` · 로그인 `/login`) 전용.
 *
 * 원천 = V3 기출총평 톤 (globals.css `.v3-*`, naver-v3-renderer.ts, V3ReportPreview).
 * V3 파일은 불가침(수정 금지)이라 의도적 단방향 복제 — V3 톤 변경 시 여기도 맞출 것.
 * Tailwind 유틸 토큰은 globals.css 말미 `--color-ed-*` / `--shadow-ed-*` / `.ed-*` 참조.
 * ⚠️ 기존 `--color-ink`(#0F172A, v2 슬레이트)와 별개 — 앱 내부 토큰과 혼용 금지.
 */

// ── 색 ──
export const PAPER = '#FBF9F4';      // 크림 페이퍼 (페이지 배경)
export const PAPER_2 = '#F4F1E8';    // 짙은 크림 (스트립/박스 배경)
export const INK = '#121212';        // 에디토리얼 잉크 (헤드라인/다크 밴드)
export const INK_SOFT = '#2A2A2A';   // 본문 잉크
export const GRAY = '#888';          // 보조 텍스트
export const RED = '#BF1722';        // 포인트 레드 (키커/강조)
export const RULE = '#E6E2D8';       // 밝은 괘선
export const RULE_DARK = '#333';     // 다크 밴드 내부 괘선
export const AMBER = '#FFA940';      // KPI 강조 1 (V3 관례)
export const GREEN = '#2F7B3A';      // KPI 강조 2 (V3 관례)

// ── 폰트 스택 (루트 layout.tsx next/font 변수 주입 전제) ──
export const SERIF = 'var(--font-serif-kr), "Noto Serif KR", serif';
export const BODONI = 'var(--font-bodoni), "Bodoni Moda", serif';
export const ABRIL = 'var(--font-abril), "Abril Fatface", "Bodoni Moda", serif';
export const SANS = 'Pretendard, system-ui, sans-serif';

// ── 그림자 ──
/** 페이퍼 부유 그림자 (V3ReportPreview 원본 그대로) */
export const ED_FLOAT_SHADOW = '0 24px 60px -24px rgba(15,23,42,0.32), 0 0 0 1px #e6e2d8';
