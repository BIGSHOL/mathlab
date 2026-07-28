/**
 * 총평 테마 CSS 변수 블록 생성 → globals.css 의 마커 사이에 주입.
 *
 * SoT 는 src/lib/exam-analysis/commentary-themes.ts.
 * 팔레트를 바꾼 뒤 반드시 재실행:
 *   npx tsx scripts/generate-commentary-theme-css.ts
 *
 * 마커 밖은 절대 건드리지 않으므로 반복 실행해도 안전(idempotent).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  COMMENTARY_THEMES,
  DEFAULT_THEME_ID,
  themeCssVars,
} from '../src/lib/exam-analysis/commentary-themes';
import {
  COMMENTARY_LAYOUTS,
  DEFAULT_LAYOUT_ID,
  layoutCssVars,
} from '../src/lib/exam-analysis/commentary-layouts';

const CSS_PATH = 'src/app/globals.css';
const BEGIN = '/* >>> commentary-themes: 자동 생성 — 수정하지 말 것 (generate-commentary-theme-css.ts) */';
const END = '/* <<< commentary-themes */';

function block(selector: string, vars: Record<string, string>, comment: string): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `/* ${comment} */\n${selector} {\n${body}\n}`;
}

const parts: string[] = [];

for (const theme of COMMENTARY_THEMES) {
  const vars = themeCssVars(theme.colors);
  if (theme.id === DEFAULT_THEME_ID) {
    // 기본 테마는 .v3 루트에 선언 → 클래스 없이도 동작 (기존 분석본 무변경 보장)
    parts.push(block('.v3', vars, `${theme.label} — 기본 테마 (${theme.description})`));
  } else {
    parts.push(block(`.v3.v3-theme-${theme.id}`, vars, `${theme.label} — ${theme.description}`));
  }
}

// 레이아웃(골격) — 서체 4역할 · 타입 스케일 · 여백 · 모서리 · 괘선
const layoutParts: string[] = [];
for (const layout of COMMENTARY_LAYOUTS) {
  const vars = layoutCssVars(layout.tokens);
  if (layout.id === DEFAULT_LAYOUT_ID) {
    layoutParts.push(block('.v3', vars, `골격: ${layout.label} — 기본 (${layout.description})`));
  } else {
    layoutParts.push(block(`.v3.v3-layout-${layout.id}`, vars, `골격: ${layout.label} — ${layout.description}`));
  }
}

const generated = [
  BEGIN,
  '/* 총평 디자인 토큰 — 팔레트(테마) + 활자·여백(레이아웃).',
  '   색상은 hex 리터럴만 — oklch()/color-mix() 는 modern-screenshot 캡처(블로그 이미지 복사)에서',
  '   파싱 실패하므로 금지. 서체 변수는 (teacher)/layout.tsx 가 로드한다. */',
  ...parts,
  ...layoutParts,
  END,
].join('\n');

const css = readFileSync(CSS_PATH, 'utf8');
const beginIdx = css.indexOf(BEGIN);
const endIdx = css.indexOf(END);

let next: string;
if (beginIdx >= 0 && endIdx > beginIdx) {
  next = css.slice(0, beginIdx) + generated + css.slice(endIdx + END.length);
  console.log('기존 블록 갱신');
} else {
  // 최초 삽입 — V3 리디자인 섹션 주석 바로 앞
  const anchor = '/* ============================================\n   기출분석 V3 리디자인';
  const at = css.indexOf(anchor);
  if (at < 0) {
    console.error('❌ 삽입 위치(V3 리디자인 섹션 주석)를 찾지 못했습니다.');
    process.exit(1);
  }
  next = css.slice(0, at) + generated + '\n\n' + css.slice(at);
  console.log('신규 삽입');
}

writeFileSync(CSS_PATH, next, 'utf8');
const colorCount = Object.keys(themeCssVars(COMMENTARY_THEMES[0].colors)).length;
const layoutCount = Object.keys(layoutCssVars(COMMENTARY_LAYOUTS[0].tokens)).length;
console.log(
  `✅ 테마 ${COMMENTARY_THEMES.length}종(색 ${colorCount}토큰) · 레이아웃 ${COMMENTARY_LAYOUTS.length}종(활자·여백 ${layoutCount}토큰) → ${CSS_PATH}`,
);
