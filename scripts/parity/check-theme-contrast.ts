/**
 * 총평 테마 대비 정적 검사.
 *
 * 13 테마 × 25 레이아웃을 눈으로 훑을 수 없다. 팔레트 토큰 실값과
 * globals.css 의 `.v3` 스코프 규칙을 교차해 WCAG 상대휘도 대비를 계산한다.
 *
 * 잡는 병 (§12-15 의 형제들):
 *   1. 채움 토큰(ink/gold/accent/surface-dark) 위에 on-dark·paper·ink 글자 —
 *      같은 규칙이거나, 그 면을 칠한 조상 아래 전경 규칙
 *   2. 채움 토큰으로 면을 칠하면서 color 를 안 적은 규칙
 *      (상속을 정적으로 완벽히 못 쫓으므로 그 자체로 위반)
 *   3. 글자 규칙이 color 없이 데이터박스 위에 앉아 앱 기본색(#13142B)을 상속
 *   4. color/border 의 하드코딩 hex·rgba(0,0,0) — 테마가 뒤집히면 무조건 깨진다
 *   5. 히트맵 칸·도트 매트릭스 — 배경이 인라인 --v3-diff-N 이라 CSS 만으로는
 *      안 보인다. 선택자 이름으로 5단계 램프와 강제 결합.
 *      칸마다 레벨이 달라 단일 전경으로는 4.5 를 전 램프에 못 맞춘다.
 *      여기서는 **붕괴(<3:1)** 만 고정한다.
 *   6. 투명 면 + 점선 테두리(서술형 범례) — 테두리색 vs 지면
 *
 * 실행: npx tsx scripts/parity/check-theme-contrast.ts
 *    또는 npm run verify:contrast
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COMMENTARY_THEMES,
  themeCssVars,
  type CommentaryTheme,
  type CommentaryThemeColors,
} from '../../src/lib/exam-analysis/commentary-themes';

/** 앱 셸 기본 글자색 (globals.css body → --color-text-primary). */
const APP_DEFAULT_FG = '#13142B';

const BODY_RATIO = 4.5;
const LARGE_RATIO = 3.0;
/** 난이도 램프 위 문항번호 — 단일 전경으로 5칸 4.5 를 못 맞춤. 붕괴만. */
const RAMP_RATIO = 3.0;

const FILL_TOKENS = new Set([
  '--v3-ink',
  '--v3-gold',
  '--v3-accent',
  '--v3-surface-dark',
  '--v3-pos',
]);

interface Rgb { r: number; g: number; b: number; a: number }
interface Decls {
  background?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  border?: string;
  borderColor?: string;
  height?: string;
}
interface Rule {
  selector: string;
  decls: Decls;
  themeId: string | null;
  order: number;
}
interface Resolved {
  rgb: Rgb;
  token: string | null;
  raw: string;
}
interface Finding {
  theme: string;
  selector: string;
  ratio: number | null;
  threshold: number;
  fg: string;
  bg: string;
  tokens: string;
  reason: string;
}

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

/* ── 화이트리스트 ───────────────────────────────────────────────────────
   과다 검출이 검사를 죽이면 안 되므로, 글자를 올리지 않거나 글자색을
   다른 규칙이 담당함이 **구조적으로** 확실한 것만 뺀다. 한 줄 이유를 남긴다. */
const SKIP_SELECTORS = new Set<string>([
  // 장식 막대/칸 — 글자를 올리지 않음
  '.v3-data-box .v3-data-row .v3-data-track',
  '.v3-data-box .v3-data-row .v3-data-track .v3-data-fill',
  '.v3-data-box .v3-data-row .v3-data-track .v3-data-fill.v3-up',
  '.v3-data-box .v3-data-row .v3-data-track .v3-data-fill.v3-down',
  '.v3-diff-count-cell.is-on',
  '.v3-diff-count-cell.is-off',
  '.v3-data-grid-cell.is-on',
  '.v3-data-grid-cell.is-off',
  '.v3-diff-pts-track',
  '.v3-diff-pts-fill',
  '.v3-diff-swatch',
  '.v3-numtable-dot',
  '.v3-recipe-chili',
  '.v3-recipe-chili.is-on',
  '.v3-heatmap-leg i',
  '.v3-dotmatrix-legend .v3-dot',
  '.v3-viz-hollow .v3-dot',
  // 수정자 클래스 — 글자색은 베이스 `.v3-strategy-tag` 가 담당 (다크 라벨 보정 포함)
  '.v3-strategy-tag-now',
  '.v3-strategy-tag-act',
  // 노트·모눈의 괘선 가림 마스크. 글자색은 기본 h3/p (ink) 가 담당
  '.v3-layout-notebook .v3-section h3',
  '.v3-layout-grid .v3-section h3',
  '.v3-layout-grid .v3-section > p',
  // KPI 스트립 — 자식 `.v3-kpi` / `.v3-kpi-hero-*` 가 on-dark·gold·pos 를 소유.
  // 선택자가 조상 prefix 가 아니라서 정적 자손 추적이 안 됨.
  '.v3-kpi-row',
  '.v3-kpi-row-hero',
  '.v3-kpi-row.v3-kpi-row-terminal',
]);

/** 난이도 램프 대비는 다크·미니멀만. 밝은 11종 L5 칸의 2.x 는 기존 캡처 값이라 여기서 열지 않는다. */
const RAMP_THEMES = new Set(['terminal', 'chalkboard', 'mono']);

/** 캡션/구분선 토큰 — 채움 조상과 짝 지어 본문 4.5 를 들이대지 않는다. */
const CAPTION_TOKENS = new Set(['--v3-muted', '--v3-line', '--v3-line-soft', '--v3-dark-line']);

function normSel(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/\s*>\s*/g, ' > ').trim();
}

function isSkipped(selector: string): boolean {
  const n = normSel(selector);
  if (SKIP_SELECTORS.has(n)) return true;
  if (/:(hover|focus|active|visited|first-letter|first-of-type|nth-|not\(|lang\()/.test(n)) return true;
  if (/::(before|after|placeholder)/.test(n)) return true;
  if (/\[style\*/.test(n)) return true;
  return false;
}

/* ── 색 파싱 / WCAG ─────────────────────────────────────────────────── */

function parseHex(raw: string): Rgb | null {
  const h = raw.trim().toLowerCase();
  const m3 = /^#([0-9a-f]{3})$/.exec(h);
  if (m3) {
    const [r, g, b] = m3[1].split('').map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }
  const m6 = /^#([0-9a-f]{6})$/.exec(h);
  if (m6) {
    return {
      r: parseInt(m6[1].slice(0, 2), 16),
      g: parseInt(m6[1].slice(2, 4), 16),
      b: parseInt(m6[1].slice(4, 6), 16),
      a: 1,
    };
  }
  const m8 = /^#([0-9a-f]{8})$/.exec(h);
  if (m8) {
    return {
      r: parseInt(m8[1].slice(0, 2), 16),
      g: parseInt(m8[1].slice(2, 4), 16),
      b: parseInt(m8[1].slice(4, 6), 16),
      a: parseInt(m8[1].slice(6, 8), 16) / 255,
    };
  }
  return null;
}

function parseRgbFunc(raw: string): Rgb | null {
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(raw.trim());
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] === undefined ? 1 : Number(m[4]),
  };
}

function lin(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function relLum(c: Rgb): number {
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}
function blend(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}
function contrastRatio(a: Rgb, b: Rgb): number {
  const top = a.a < 1 ? blend(a, b) : a;
  const bot = b.a < 1 ? blend(b, { r: 255, g: 255, b: 255, a: 1 }) : b;
  const L1 = relLum(top);
  const L2 = relLum(bot);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
function rgbToHex(c: Rgb): string {
  const n = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${n(c.r)}${n(c.g)}${n(c.b)}`;
}

/* ── 토큰 해석 ──────────────────────────────────────────────────────── */

const TOKEN_TO_FIELD: Record<string, keyof CommentaryThemeColors | `diff${1 | 2 | 3 | 4 | 5}`> = {
  '--v3-accent': 'accent',
  '--v3-gold': 'gold',
  '--v3-pos': 'pos',
  '--v3-ink': 'ink',
  '--v3-surface-dark': 'surfaceDark',
  '--v3-on-dark': 'onDark',
  '--v3-on-dark-soft': 'onDarkSoft',
  '--v3-body': 'body',
  '--v3-body-soft': 'bodySoft',
  '--v3-muted': 'muted',
  '--v3-paper': 'paper',
  '--v3-paper-alt': 'paperAlt',
  '--v3-paper-foot': 'paperFoot',
  '--v3-line': 'line',
  '--v3-line-soft': 'lineSoft',
  '--v3-conclusion-bg': 'conclusionBg',
  '--v3-quote-line': 'quoteLine',
  '--v3-dark-line': 'darkLine',
  '--v3-gold-glow': 'goldGlow',
  '--v3-diff-1': 'diff1',
  '--v3-diff-2': 'diff2',
  '--v3-diff-3': 'diff3',
  '--v3-diff-4': 'diff4',
  '--v3-diff-5': 'diff5',
};

function tokenValue(theme: CommentaryTheme, token: string): string | null {
  const field = TOKEN_TO_FIELD[token];
  if (!field) return null;
  const c = theme.colors;
  if (field === 'diff1') return c.diff[0];
  if (field === 'diff2') return c.diff[1];
  if (field === 'diff3') return c.diff[2];
  if (field === 'diff4') return c.diff[3];
  if (field === 'diff5') return c.diff[4];
  return c[field] as string;
}

function isTransparent(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === 'transparent' || v === 'none' || v === 'inherit' || v === 'currentcolor';
}

function extractFirstColorish(value: string): string {
  const v = value.trim();
  const g = /linear-gradient\([^,]+,\s*(.+)$/i.exec(v);
  if (g) {
    const stop = g[1].split(',')[0].trim().replace(/\s+\d+%\s*$/, '').trim();
    return stop;
  }
  return v;
}

function resolveColor(value: string, theme: CommentaryTheme): Resolved | null {
  if (!value) return null;
  const first = extractFirstColorish(value).replace(/!important/gi, '').trim();
  if (!first || isTransparent(first)) return null;

  const varRe = /^var\(\s*(--v3-[a-z0-9-]+)\s*(?:,\s*(.+))?\s*\)$/i;
  const vm = varRe.exec(first);
  if (vm) {
    const hex = tokenValue(theme, vm[1]);
    if (hex) {
      const rgb = parseHex(hex) ?? parseRgbFunc(hex);
      if (rgb) return { rgb, token: vm[1], raw: first };
    }
    if (vm[2]) return resolveColor(vm[2].trim(), theme);
    return null;
  }
  const nested = /var\(\s*--[a-z0-9-]+\s*,\s*(var\(--v3-[a-z0-9-]+[^)]*\))/i.exec(first);
  if (nested) return resolveColor(nested[1], theme);

  const hex = parseHex(first);
  if (hex) return { rgb: hex, token: null, raw: first };
  const rgb = parseRgbFunc(first);
  if (rgb) return { rgb, token: null, raw: first };
  return null;
}

function extractBorderColor(border: string): string | null {
  const v = border.replace(/!important/gi, '').trim();
  const varM = /var\(--v3-[a-z0-9-]+(?:\s*,\s*[^)]+)?\)/i.exec(v);
  if (varM) return varM[0];
  const rgba = /rgba?\([^)]+\)/i.exec(v);
  if (rgba) return rgba[0];
  const hex = /#(?:[0-9a-f]{3,8})\b/i.exec(v);
  if (hex) return hex[0];
  return null;
}

function isHardcodedColor(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.replace(/!important/gi, '').trim();
  if (/#[0-9a-f]{3,8}\b/i.test(v)) return true;
  if (/rgba?\(\s*0\s*,\s*0\s*,\s*0\b/i.test(v)) return true;
  if (/rgba?\(\s*255\s*,\s*255\s*,\s*255\b/i.test(v)) return true;
  return false;
}

/** 점선·불투명 흑/백 테두리만. 8% 흑 칸 테두리는 장식이라 제외. */
function isHardcodedMarkBorder(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.replace(/!important/gi, '').trim();
  if (!/(dashed|dotted)/i.test(v) && !/heatmap-essay/.test(v)) {
    // 호출부가 선택자를 모르므로 점선이 아니면 알파 ≥ 0.4 만
    const a = /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)/i.exec(v);
    if (a && Number(a[1]) >= 0.4) return true;
    if (/#[0-9a-f]{3,8}\b/i.test(v)) return true;
    return false;
  }
  return /rgba?\(\s*0\s*,\s*0\s*,\s*0\b/i.test(v) || /rgba?\(\s*255\s*,\s*255\s*,\s*255\b/i.test(v) || /#[0-9a-f]{3,8}\b/i.test(v);
}

/* ── CSS 파서 (V3 스코프만) ─────────────────────────────────────────── */

function v3Slice(css: string): string {
  const mark = css.indexOf('기출분석 V3 리디자인');
  if (mark < 0) throw new Error('globals.css 에서 V3 섹션 시작 주석을 찾지 못했다');
  const begin = css.lastIndexOf('/*', mark);
  const end = css.indexOf('V4 (갈수학학원 스타일)');
  return css.slice(begin >= 0 ? begin : mark, end > mark ? end : undefined);
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseDecls(body: string): Decls {
  const out: Decls = {};
  for (const part of body.split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (!prop || !val) continue;
    if (prop === 'background' || prop === 'background-color') {
      if (/^url\(/i.test(val)) continue;
      if (!out.background || prop === 'background-color') out.background = val;
    } else if (prop === 'color') out.color = val;
    else if (prop === 'font-size') out.fontSize = val;
    else if (prop === 'font-weight') out.fontWeight = val;
    else if (prop === 'border') out.border = val;
    else if (prop === 'border-color') out.borderColor = val;
    else if (prop === 'height') out.height = val;
  }
  return out;
}

function themeOfSelector(sel: string): string | null {
  const m = /\.v3-theme-([a-z0-9-]+)/.exec(sel);
  return m ? m[1] : null;
}

function parseRules(css: string): Rule[] {
  const slice = stripComments(v3Slice(css));
  const rules: Rule[] = [];
  let order = 0;
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice))) {
    const selChunk = m[1].trim();
    if (!selChunk || selChunk.startsWith('@')) continue;
    const decls = parseDecls(m[2]);
    for (const rawSel of selChunk.split(',')) {
      const selector = normSel(rawSel);
      if (!selector) continue;
      if (!selector.startsWith('.v3')) continue;
      rules.push({
        selector,
        decls,
        themeId: themeOfSelector(selector),
        order: order++,
      });
    }
  }
  return rules;
}

function ruleApplies(rule: Rule, themeId: string): boolean {
  return rule.themeId === null || rule.themeId === themeId;
}

function isLargeText(decls: Decls): boolean {
  const fs = decls.fontSize ?? '';
  const weight = Number(decls.fontWeight ?? '400');
  const bold = weight >= 700 || /bold/i.test(decls.fontWeight ?? '');
  if (/--v3-h1-size|--v3-hero-num|--v3-kpi-size/.test(fs)) return true;
  if (/--v3-h3-size|--v3-h2-size|--v3-dek-size|--v3-body-size/.test(fs)) return false;
  const px = /^(\d+(?:\.\d+)?)px$/.exec(fs.trim());
  if (px) {
    const n = Number(px[1]);
    if (n >= 24) return true;
    if (n >= 18.67 && bold) return true;
  }
  return false;
}

function paintedBg(rule: Rule, theme: CommentaryTheme): Resolved | null {
  if (!rule.decls.background) return null;
  if (isTransparent(rule.decls.background)) return null;
  if (/^(repeating-)?linear-gradient/i.test(rule.decls.background) && /transparent/i.test(rule.decls.background)) {
    return null;
  }
  return resolveColor(rule.decls.background, theme);
}

function fgOf(rule: Rule, theme: CommentaryTheme): Resolved | null {
  if (!rule.decls.color) return null;
  if (isTransparent(rule.decls.color) || /inherit/i.test(rule.decls.color)) return null;
  return resolveColor(rule.decls.color, theme);
}

function isFillToken(bg: Resolved): boolean {
  return !!bg.token && FILL_TOKENS.has(bg.token);
}

function isDescendantSel(child: string, parent: string): boolean {
  if (child === parent) return false;
  return child.startsWith(parent + ' ') || child.startsWith(parent + ' > ');
}

function compoundSubset(general: string, specific: string): boolean {
  const g = splitCompound(general);
  const s = splitCompound(specific);
  if (g.el && g.el !== s.el) return false;
  for (const c of g.classes) if (!s.classes.has(c)) return false;
  return true;
}

function splitCompound(c: string): { el: string | null; classes: Set<string> } {
  const classes = new Set<string>();
  let el: string | null = null;
  const token = c.replace(/:[^\s.#[]+/g, '').replace(/\[[^\]]*]/g, '');
  const bits = token.split(/(?=\.)/).filter(Boolean);
  for (const b of bits) {
    if (b.startsWith('.')) classes.add(b.slice(1).replace(/:.*/, ''));
    else el = b.replace(/:.*/, '');
  }
  return { el, classes };
}

function generalAppliesTo(general: string, specific: string): boolean {
  if (general === specific) return true;
  const g = general.split(/ > | /).filter(Boolean);
  const s = specific.split(/ > | /).filter(Boolean);
  if (g.length > s.length) return false;
  for (let i = 1; i <= g.length; i++) {
    if (!compoundSubset(g[g.length - i], s[s.length - i])) return false;
  }
  return true;
}

/** 테마 스코프 규칙을 같은 요소의 비스코프 선택자에 매칭. */
function appliesInTheme(ruleSel: string, targetSel: string, themeId: string): boolean {
  const scoped = themeOfSelector(ruleSel);
  if (scoped && scoped !== themeId) return false;
  if (scoped) {
    const stripped = ruleSel.replace(new RegExp(`^\\.v3\\.v3-theme-${scoped}\\s+`), '');
    return stripped === targetSel || generalAppliesTo(stripped, targetSel);
  }
  return generalAppliesTo(ruleSel, targetSel);
}

function specScore(sel: string): number {
  return sel.length + (themeOfSelector(sel) ? 100 : 0);
}

function hasDescendantColor(parent: Rule, all: Rule[]): boolean {
  return all.some((r) => isDescendantSel(r.selector, parent.selector) && !!r.decls.color && !/inherit/i.test(r.decls.color ?? ''));
}

function winningFgOn(target: Rule, all: Rule[], theme: CommentaryTheme): Resolved | null {
  let best: { spec: number; order: number; fg: Resolved } | null = null;
  for (const r of all) {
    if (!r.decls.color) continue;
    if (!appliesInTheme(r.selector, target.selector, theme.id)) continue;
    const fg = fgOf(r, theme);
    if (!fg) continue;
    const spec = specScore(r.selector);
    if (!best || spec > best.spec || (spec === best.spec && r.order > best.order)) {
      best = { spec, order: r.order, fg };
    }
  }
  return best?.fg ?? null;
}

function winningBgOn(target: Rule, all: Rule[], theme: CommentaryTheme): Resolved | null {
  let best: { spec: number; order: number; bg: Resolved } | null = null;
  for (const r of all) {
    const bg = paintedBg(r, theme);
    if (!bg) continue;
    if (!appliesInTheme(r.selector, target.selector, theme.id)) continue;
    const spec = specScore(r.selector);
    if (!best || spec > best.spec || (spec === best.spec && r.order > best.order)) {
      best = { spec, order: r.order, bg };
    }
  }
  return best?.bg ?? null;
}

function addFinding(list: Finding[], f: Finding) {
  const key = `${f.theme}|${f.selector}|${f.reason}|${f.fg}|${f.bg}`;
  if (list.some((x) => `${x.theme}|${x.selector}|${x.reason}|${x.fg}|${x.bg}` === key)) return;
  list.push(f);
}

function describe(c: Resolved): string {
  return `${c.token ?? c.raw} ${rgbToHex(c.rgb)}`;
}

function checkPair(
  findings: Finding[],
  theme: CommentaryTheme,
  selector: string,
  fg: Resolved,
  bg: Resolved,
  decls: Decls,
  reason: string,
  threshold = isLargeText(decls) ? LARGE_RATIO : BODY_RATIO,
) {
  const ratio = contrastRatio(fg.rgb, bg.rgb);
  if (ratio + 1e-9 >= threshold) return;
  addFinding(findings, {
    theme: theme.id,
    selector,
    ratio: Math.round(ratio * 100) / 100,
    threshold,
    fg: describe(fg),
    bg: describe(bg),
    tokens: [fg.token, bg.token].filter(Boolean).join(' × ') || '(리터럴)',
    reason,
  });
}

function main() {
  const cssPath = resolve(process.cwd(), 'src/app/globals.css');
  const css = readFileSync(cssPath, 'utf8');
  const rules = parseRules(css);

  console.log(`V3 규칙 ${rules.length}개 · 테마 ${COMMENTARY_THEMES.length}종\n`);

  console.log('── ① 테마 토큰 정합 ──');
  for (const t of COMMENTARY_THEMES) {
    const vars = themeCssVars(t.colors);
    ok(Object.keys(vars).length >= 20, `${t.id.padEnd(12)} CSS 변수 ${Object.keys(vars).length}개`);
    ok(/^#/.test(t.colors.ink) && /^#/.test(t.colors.paper), `${t.id.padEnd(12)} ink/paper 가 hex`);
  }

  const findings: Finding[] = [];
  const missingColor: Finding[] = [];
  const hardcoded: Finding[] = [];

  for (const theme of COMMENTARY_THEMES) {
    const themed = rules.filter((r) => ruleApplies(r, theme.id) && !isSkipped(r.selector));
    const painted: Array<{ rule: Rule; bg: Resolved }> = [];
    for (const r of themed) {
      const bg = paintedBg(r, theme);
      if (bg) painted.push({ rule: r, bg });
    }
    for (const r of themed) {
      const ownBg = paintedBg(r, theme);
      const ownFg = fgOf(r, theme);
      const bg = winningBgOn(r, themed, theme) ?? ownBg;
      const fg = winningFgOn(r, themed, theme) ?? ownFg;

      // 4. 하드코딩 hex / 검정·흰 rgba (테마와 무관 — 한 번만)
      if (theme.id === COMMENTARY_THEMES[0].id) {
        if (isHardcodedColor(r.decls.color) || isHardcodedMarkBorder(r.decls.border) || isHardcodedMarkBorder(r.decls.borderColor)) {
          const lit = r.decls.color || r.decls.borderColor || r.decls.border || '';
          addFinding(hardcoded, {
            theme: '*',
            selector: r.selector,
            ratio: null,
            threshold: BODY_RATIO,
            fg: lit.replace(/\s+/g, ' ').slice(0, 80),
            bg: '—',
            tokens: '(리터럴)',
            reason: '하드코딩 hex/rgba — 테마 토큰이 아님',
          });
        }
      }

      // 1. 같은 규칙(또는 테마 오버라이드가 이긴 값)의 채움+전경
      if (bg && fg && isFillToken(bg)) {
        checkPair(findings, theme, r.selector, fg, bg, r.decls, '같은 규칙의 채움/전경');
      }

      // 2. 채움 토큰으로 면을 칠하고 이 규칙에 color 없음.
      //    대비는 ①에서 테마 오버라이드가 이긴 값으로 이미 본다. 여기선 선언 누락만.
      if (ownBg && !ownFg && isFillToken(ownBg)) {
        if (!hasDescendantColor(r, themed) && !fg) {
          addFinding(missingColor, {
            theme: theme.id,
            selector: r.selector,
            ratio: null,
            threshold: BODY_RATIO,
            fg: '(미지정)',
            bg: describe(ownBg),
            tokens: ownBg.token ?? '(리터럴)',
            reason: '채움 토큰으로 면을 칠하면서 전경색을 선언하지 않음',
          });
        }
      }

      // 1b. 채움 조상 위의 전경 (on-dark 가 ink 면 위에 앉는 타블로이드 패턴)
      if (fg && !ownBg) {
        const parts = r.selector.split(/ > | /).filter(Boolean);
        let ancFill: { sel: string; bg: Resolved } | null = null;
        for (let n = parts.length - 1; n >= 1; n--) {
          const ancestorSel = parts.slice(0, n).join(' ');
          const dummy: Rule = { selector: ancestorSel, decls: {}, themeId: null, order: -1 };
          const wbg = winningBgOn(dummy, themed, theme);
          if (wbg && isFillToken(wbg)) {
            ancFill = { sel: ancestorSel, bg: wbg };
            break;
          }
        }
        if (ancFill && !CAPTION_TOKENS.has(fg.token ?? '')) {
          checkPair(
            findings,
            theme,
            r.selector,
            fg,
            ancFill.bg,
            r.decls,
            `채움 조상 ${ancFill.sel}`,
          );
        }
      }

      // 3. 데이터박스 라벨·수치가 color 없이 박스 위에 앉음
      //    `.v3-data-v-num` 단독 규칙(폰트만)은 제외 — 실제 라벨은 data-box/data-row 아래.
      if (/\.v3-data-(nm|v-num)\b/.test(r.selector) && /data-box|data-row/.test(r.selector) && !ownFg) {
        const box = painted.find((p) => isDescendantSel(r.selector, p.rule.selector) && /data-box/.test(p.rule.selector));
        const surface = box?.bg ?? painted.find((p) => p.rule.selector === '.v3-data-box')?.bg;
        if (surface) {
          const used = fg ?? { rgb: parseHex(APP_DEFAULT_FG)!, token: null, raw: APP_DEFAULT_FG };
          checkPair(findings, theme, r.selector, used, surface, r.decls, '데이터박스 라벨이 전경색 없이 앱 기본색 상속');
          if (!fg) {
            addFinding(missingColor, {
              theme: theme.id,
              selector: r.selector,
              ratio: null,
              threshold: BODY_RATIO,
              fg: `(미지정, 앱 기본 ${APP_DEFAULT_FG})`,
              bg: describe(surface),
              tokens: surface.token ?? '',
              reason: '데이터박스 라벨·수치에 color 없음',
            });
          }
        }
      }

      // 6. 서술형 점선 테두리 vs 지면
      if (/heatmap-essay|leg-essay/.test(r.selector)) {
        const braw = r.decls.borderColor || extractBorderColor(r.decls.border ?? '') || r.decls.border;
        const paper = resolveColor('var(--v3-paper)', theme);
        if (braw && paper) {
          const br = resolveColor(braw, theme);
          if (br) {
            checkPair(findings, theme, r.selector, br, paper, { ...r.decls, fontSize: '11px' }, '점선 테두리 vs 지면');
          }
        }
      }
    }

    // 5. 히트맵·도트 vs 난이도 램프 (붕괴 < 3:1) — 다크·미니멀만
    if (!RAMP_THEMES.has(theme.id)) continue;
    const heatmapRules = themed.filter((r) => /(^| )\.v3-heatmap-cell$/.test(r.selector) || r.selector === '.v3-heatmap-cell');
    const killerRules = themed.filter((r) => r.selector.includes('v3-heatmap-killer') && !r.selector.includes(' '));
    const dotRules = themed.filter((r) => r.selector === '.v3-dot');

    for (const n of [1, 2, 3, 4, 5] as const) {
      const diff = resolveColor(`var(--v3-diff-${n})`, theme);
      if (!diff) continue;
      // 히트맵은 심화·최고난도(killer)만 — 단일 전경으로 L1~L3 까지 4.5 를 맞출 수 없다
      if (n >= 4) for (const r of heatmapRules) {
        const killer = n >= 4 ? killerRules.find((k) => winningFgOn(k, themed, theme) || k.decls.color) : undefined;
        const fg =
          (n >= 4 ? (killer ? winningFgOn(killer, themed, theme) ?? fgOf(killer, theme) : null) : null)
          ?? winningFgOn(r, themed, theme)
          ?? fgOf(r, theme)
          ?? (r.decls.color ? null : { rgb: parseHex('#12100E')!, token: null, raw: '#12100E' });
        if (!fg) continue;
        checkPair(
          findings,
          theme,
          `${r.selector}${n >= 4 ? ' .v3-heatmap-killer' : ''} [diff-${n}]`,
          fg,
          diff,
          r.decls,
          `히트맵 칸 vs --v3-diff-${n}`,
          RAMP_RATIO,
        );
      }
      for (const r of dotRules) {
        const fg = winningFgOn(r, themed, theme) ?? fgOf(r, theme);
        if (!fg) continue;
        checkPair(
          findings,
          theme,
          `${r.selector} [diff-${n}]`,
          fg,
          diff,
          { ...r.decls, fontSize: r.decls.fontSize ?? '11px' },
          `도트 매트릭스 vs --v3-diff-${n}`,
          RAMP_RATIO,
        );
      }
    }
  }

  function dump(title: string, rows: Finding[]) {
    console.log(`\n── ${title} ──`);
    if (rows.length === 0) {
      ok(true, '해당 없음');
      return;
    }
    rows.sort((a, b) => a.theme.localeCompare(b.theme) || a.selector.localeCompare(b.selector));
    for (const f of rows) {
      const ratio = f.ratio === null ? '—' : `${f.ratio.toFixed(2)}:1 < ${f.threshold}`;
      ok(false, `${f.theme}  ${f.selector}`, `${ratio}  (${f.reason})  fg ${f.fg}  bg ${f.bg}  ${f.tokens}`);
    }
  }

  dump('② 전경/배경 대비', findings);
  dump('③ 채움 면 + 전경색 미지정', missingColor);
  dump('④ 하드코딩 hex/rgba', hardcoded);

  console.log('\n──────────────────────────────');
  if (fail) {
    console.log(`❌ 실패 ${fail}건`);
    process.exit(1);
  }
  console.log('✅ 통과');
}

main();
