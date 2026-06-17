/**
 * 기출 분석 차트 이미지 서버 생성기
 *
 * SVG 생성 → sharp로 PNG 변환
 * 블로그 글에 삽입할 차트 이미지를 서버에서 자동 생성
 */

// Turbopack에서 네이티브 모듈 정적 import 불가 → 런타임 require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getResvg = () => require('@resvg/resvg-js').Resvg as typeof import('@resvg/resvg-js').Resvg;
import { writeFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  DIFFICULTY_COLORS,
  QUESTION_TYPE_COLORS,
  QUESTION_TYPE_LABELS,
  ABILITY_DOMAIN_LABELS,
  ABILITY_DOMAIN_COLORS,
  TYPE_TO_DOMAIN,
} from './constants';
import type { AnalyzedQuestion } from './types';
import { formatPoints } from './points';

// ── 차트 버전 — 디자인 업그레이드 시 bump → chart endpoint가 자동 재생성 ──
// v1: 기본 (그라데이션 없음, 작은 폰트)
// v2: 그라데이션 + 섀도우 + 큰 폰트 + 강조 라인 (2026-05-28)
// v3: 유형 5대→4대 영역 전환 (축·라벨·색 변경, 옛 캐시 무효화) (2026-06-17)
export const CHART_VERSION = 'v3';

// ── SVG 유틸 ──

const CHART_WIDTH = 680;
const CHART_HEIGHT = 420;
const FONT_FAMILY = "'Noto Sans KR', sans-serif";

function svgWrap(inner: string, width = CHART_WIDTH, height = CHART_HEIGHT): string {
  // v1.1 (2026-05-28): 배경에 미세 그라데이션 + 보더로 카드 느낌 강화
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <linearGradient id="chart-bg" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#FFFFFF"/>
    <stop offset="100%" stop-color="#FAFBFC"/>
  </linearGradient>
</defs>
<style>text { font-family: ${FONT_FAMILY}; }</style>
<rect width="${width}" height="${height}" fill="url(#chart-bg)" rx="12" stroke="#E5E7EB" stroke-width="1"/>
${inner}
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── 난이도 분포 도넛 차트 ──

const DIFFICULTY_LEVEL_LABELS: Record<string, string> = {
  '1': '기본 (Level 1)',
  '2': '표준 (Level 2)',
  '3': '응용 (Level 3)',
  '4': '심화 (Level 4)',
  '5': '최고난도 (Level 5)',
};

/** 컬러 hex → 더 밝은 변형 (그라데이션 시작색). 단순 RGB shift. */
function lightenColor(hex: string, amount = 0.25): string {
  const m = hex.replace('#', '').match(/.{1,2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map((x) => parseInt(x, 16));
  const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return '#' + toHex(lighten(r)) + toHex(lighten(g)) + toHex(lighten(b));
}

export function generateDifficultyDonutSvg(
  distribution: Record<string, number>,
): string {
  // 5단계 합산
  const levels = ['1', '2', '3', '4', '5'];
  const data = levels.map((lv) => ({
    label: DIFFICULTY_LEVEL_LABELS[lv] || `Level ${lv}`,
    value: (distribution[lv] || 0) + (lv === '1' ? (distribution.concept || 0) : 0)
      + (lv === '2' ? (distribution.pattern || 0) : 0)
      + (lv === '4' ? (distribution.reasoning || 0) : 0)
      + (lv === '5' ? (distribution.creative || 0) : 0),
    color: DIFFICULTY_COLORS[lv] || '#94A3B8',
    level: lv,
  })).filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return svgWrap('<text x="400" y="250" text-anchor="middle" font-size="18" fill="#4B5563">데이터 없음</text>');

  // 차트 크기 확대 + 위치 조정 (이전 240,200,130,70 → 260,220,150,80)
  const cx = 260, cy = 220, outerR = 150, innerR = 88;
  let startAngle = -Math.PI / 2;
  const arcs: string[] = [];

  // ── SVG defs: 그라데이션 5종 + 드롭 섀도우 필터 ──
  const defs: string[] = ['<defs>'];
  for (const d of data) {
    const lightColor = lightenColor(d.color, 0.3);
    defs.push(
      `<linearGradient id="grad-diff-${d.level}" x1="0%" y1="0%" x2="100%" y2="100%">` +
        `<stop offset="0%" stop-color="${lightColor}"/>` +
        `<stop offset="100%" stop-color="${d.color}"/>` +
      `</linearGradient>`,
    );
  }
  // 드롭 섀도우 — 도넛에 깊이감
  defs.push(
    `<filter id="donut-shadow" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="3"/>` +
      `<feOffset dx="0" dy="2" result="offsetblur"/>` +
      `<feComponentTransfer><feFuncA type="linear" slope="0.18"/></feComponentTransfer>` +
      `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>`,
  );
  // 텍스트 가독성용 미세 그림자 (퍼센트 라벨)
  defs.push(
    `<filter id="text-shadow" x="-50%" y="-50%" width="200%" height="200%">` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="0.6"/>` +
      `<feOffset dx="0" dy="0.5"/>` +
      `<feComponentTransfer><feFuncA type="linear" slope="0.45"/></feComponentTransfer>` +
      `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>`,
  );
  defs.push('</defs>');
  arcs.push(defs.join(''));

  // 도넛 그룹 (필터 적용)
  arcs.push(`<g filter="url(#donut-shadow)">`);

  for (const d of data) {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    arcs.push(
      `<path d="M${x1},${y1} A${outerR},${outerR} 0 ${largeArc},1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${largeArc},0 ${x4},${y4} Z" ` +
      `fill="url(#grad-diff-${d.level})" stroke="white" stroke-width="3" stroke-linejoin="round"/>`,
    );
    startAngle = endAngle;
  }
  arcs.push('</g>');

  // 퍼센트 라벨 (별도 그룹 — shadow filter 미적용)
  startAngle = -Math.PI / 2;
  for (const d of data) {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const midAngle = startAngle + sliceAngle / 2;
    const labelR = (outerR + innerR) / 2;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const pct = Math.round((d.value / total) * 100);
    if (pct >= 4) {
      arcs.push(
        `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="800" fill="white" filter="url(#text-shadow)">${pct}%</text>`,
      );
    }
    startAngle += sliceAngle;
  }

  // 중앙 텍스트 (더 크고 명확)
  arcs.push(`<text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="11" fill="#94A3B8" font-weight="500" letter-spacing="0.1em">TOTAL</text>`);
  arcs.push(`<text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="34" font-weight="800" fill="#1F2937">${total}</text>`);
  arcs.push(`<text x="${cx}" y="${cy + 38}" text-anchor="middle" font-size="11" fill="#64748B" font-weight="600">문항</text>`);

  // 제목 (왼쪽 위, 강조 라인 추가)
  arcs.push(`<rect x="32" y="26" width="4" height="20" rx="2" fill="#3B82F6"/>`);
  arcs.push(`<text x="46" y="42" font-size="18" font-weight="700" fill="#1F2937">난이도 분포</text>`);

  // 범례 (우측, 카드 형태) — rect 더 넓게 + 둥글게
  const legendX = 460;
  let legendY = 100;
  const swatchSize = 14;
  for (const d of data) {
    const pct = Math.round((d.value / total) * 100);
    // 색상 swatch (둥근 사각형 + 미세 보더)
    arcs.push(
      `<rect x="${legendX}" y="${legendY - swatchSize / 2 - 2}" width="${swatchSize}" height="${swatchSize}" rx="3" fill="url(#grad-diff-${d.level})" stroke="${d.color}" stroke-width="0.5"/>`,
    );
    // 라벨 (큰 글씨)
    arcs.push(
      `<text x="${legendX + swatchSize + 10}" y="${legendY + 1}" font-size="13" font-weight="600" fill="#1F2937">${escapeXml(d.label)}</text>`,
    );
    // 보조 정보 (작은 글씨)
    arcs.push(
      `<text x="${legendX + swatchSize + 10}" y="${legendY + 17}" font-size="11" fill="#94A3B8" font-weight="500">${d.value}문항 · ${pct}%</text>`,
    );
    legendY += 40;
  }

  return svgWrap(arcs.join('\n'));
}

// ── 유형 분포 레이더 차트 ──

export function generateTypeRadarSvg(
  distribution: Record<string, number>,
): string {
  const types = ['number', 'change_relation', 'shape_measure', 'data_possibility'] as const;
  const data = types.map((t) => ({
    key: t,
    label: QUESTION_TYPE_LABELS[t] || t,
    value: distribution[t] || 0,
    color: QUESTION_TYPE_COLORS[t] || '#94A3B8',
  }));

  const total = data.reduce((s, d) => s + d.value, 0);
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  // 차트 영역 확대 (210,190,110 → 230,225,135) — abilityRadar와 동일 사이즈
  const cx = 230, cy = 225, radius = 135;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const startOffset = -Math.PI / 2;

  const parts: string[] = [];

  // ── defs: 다각형 그라데이션 + 섀도우 ──
  parts.push(`<defs>` +
    `<radialGradient id="grad-type" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="rgba(99,102,241,0.35)"/>` +
      `<stop offset="100%" stop-color="rgba(99,102,241,0.05)"/>` +
    `</radialGradient>` +
    `<filter id="type-shadow" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="2"/>` +
      `<feOffset dx="0" dy="1"/>` +
      `<feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>` +
      `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>` +
  `</defs>`);

  // 제목 (좌측 위 + 강조 라인)
  parts.push(`<rect x="32" y="26" width="4" height="20" rx="2" fill="#6366F1"/>`);
  parts.push(`<text x="46" y="42" font-size="18" font-weight="700" fill="#1F2937">출제 영역 분포</text>`);

  // 배경 그리드 (3단계) — 더 진하게
  for (const scale of [0.33, 0.66, 1.0]) {
    const r = radius * scale;
    const points = data.map((_, i) => {
      const angle = startOffset + i * angleStep;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${points}" fill="none" stroke="#E5E7EB" stroke-width="${scale === 1.0 ? 1.5 : 1}"/>`);
  }

  // 축 선
  for (let i = 0; i < n; i++) {
    const angle = startOffset + i * angleStep;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`);
  }

  // 데이터 다각형 (그라데이션 + 섀도우)
  if (total > 0) {
    const dataPoints = data.map((d, i) => {
      const angle = startOffset + i * angleStep;
      const r = (d.value / maxVal) * radius;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${dataPoints}" fill="url(#grad-type)" stroke="#6366F1" stroke-width="3" stroke-linejoin="round" filter="url(#type-shadow)"/>`);

    // 데이터 점 (더 크게 + 흰 보더)
    data.forEach((d, i) => {
      const angle = startOffset + i * angleStep;
      const r = (d.value / maxVal) * radius;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      parts.push(`<circle cx="${px}" cy="${py}" r="7" fill="${d.color}" stroke="white" stroke-width="3"/>`);
      // 값 표시 (점 위)
      if (d.value > 0) {
        parts.push(`<text x="${px}" y="${py - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#1F2937">${d.value}</text>`);
      }
    });
  }

  // 라벨 (영역명, 더 크게)
  data.forEach((d, i) => {
    const angle = startOffset + i * angleStep;
    const labelR = radius + 28;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    parts.push(`<text x="${lx}" y="${ly}" text-anchor="middle" font-size="13" font-weight="700" fill="#1F2937">${escapeXml(d.label)}</text>`);
  });

  // 범례 (우측 카드)
  const legendX = 460;
  let legendY = 100;
  const swatchSize = 14;
  for (const d of data) {
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
    parts.push(`<rect x="${legendX}" y="${legendY - swatchSize / 2 - 2}" width="${swatchSize}" height="${swatchSize}" rx="3" fill="${d.color}" stroke="${d.color}" stroke-width="0.5"/>`);
    parts.push(`<text x="${legendX + swatchSize + 10}" y="${legendY + 1}" font-size="13" font-weight="600" fill="#1F2937">${escapeXml(d.label)}</text>`);
    parts.push(`<text x="${legendX + swatchSize + 10}" y="${legendY + 17}" font-size="11" fill="#94A3B8" font-weight="500">${d.value}문항 · ${pct}%</text>`);
    legendY += 36;
  }

  return svgWrap(parts.join('\n'));
}

// ── 능력 영역 분포 레이더 차트 ──

export function generateAbilityRadarSvg(
  questions: AnalyzedQuestion[],
): string {
  const abilityKeys = ['calculation', 'understanding', 'problem_solving', 'reasoning'] as const;

  // 문항별 ability_domain 집계 — AnalysisResultView/TypeRadarChart와 동일한 견고 정규화:
  // 1) raw 값 toLowerCase (AI가 'CALCULATION', 'Problem-Solving' 등 변형 반환해도 매칭)
  // 2) ability_domain 비어 있으면 question_type → TYPE_TO_DOMAIN fallback
  const counts: Record<string, number> = {};
  for (const key of abilityKeys) counts[key] = 0;
  for (const q of questions) {
    const rawDomain = q.ability_domain || TYPE_TO_DOMAIN[q.question_type] || 'calculation';
    const domain = String(rawDomain).toLowerCase().replace(/-/g, '_');
    if (domain in counts) counts[domain]++;
  }

  const data = abilityKeys.map((key) => ({
    key,
    label: ABILITY_DOMAIN_LABELS[key] || key,
    value: counts[key] || 0,
    color: ABILITY_DOMAIN_COLORS[key] || '#94A3B8',
  }));

  const total = data.reduce((s, d) => s + d.value, 0);
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  // 차트 영역 확대 (210,190,110 → 230,225,135)
  const cx = 230, cy = 225, radius = 135;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const startOffset = -Math.PI / 2;

  const parts: string[] = [];

  // ── defs: 다각형 그라데이션 + 섀도우 ──
  parts.push(`<defs>` +
    `<radialGradient id="grad-ability" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="rgba(139,92,246,0.35)"/>` +
      `<stop offset="100%" stop-color="rgba(139,92,246,0.05)"/>` +
    `</radialGradient>` +
    `<filter id="ability-shadow" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="2"/>` +
      `<feOffset dx="0" dy="1"/>` +
      `<feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>` +
      `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>` +
  `</defs>`);

  // 제목 (좌측 위 + 강조 라인)
  parts.push(`<rect x="32" y="26" width="4" height="20" rx="2" fill="#8B5CF6"/>`);
  parts.push(`<text x="46" y="42" font-size="18" font-weight="700" fill="#1F2937">능력 영역 분포</text>`);

  // 배경 그리드 (3단계) — 더 진하게
  for (const scale of [0.33, 0.66, 1.0]) {
    const r = radius * scale;
    const points = data.map((_, i) => {
      const angle = startOffset + i * angleStep;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${points}" fill="none" stroke="#E5E7EB" stroke-width="${scale === 1.0 ? 1.5 : 1}"/>`);
  }

  // 축 선
  for (let i = 0; i < n; i++) {
    const angle = startOffset + i * angleStep;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`);
  }

  // 데이터 다각형 (그라데이션 + 섀도우)
  if (total > 0) {
    const dataPoints = data.map((d, i) => {
      const angle = startOffset + i * angleStep;
      const r = (d.value / maxVal) * radius;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${dataPoints}" fill="url(#grad-ability)" stroke="#8B5CF6" stroke-width="3" stroke-linejoin="round" filter="url(#ability-shadow)"/>`);

    // 데이터 점 (더 크게 + 흰 보더 + 그림자)
    data.forEach((d, i) => {
      const angle = startOffset + i * angleStep;
      const r = (d.value / maxVal) * radius;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      parts.push(`<circle cx="${px}" cy="${py}" r="7" fill="${d.color}" stroke="white" stroke-width="3"/>`);
      // 값 표시 (점 위)
      if (d.value > 0) {
        parts.push(`<text x="${px}" y="${py - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#1F2937">${d.value}</text>`);
      }
    });
  }

  // 라벨 (영역명, 더 크게)
  data.forEach((d, i) => {
    const angle = startOffset + i * angleStep;
    const labelR = radius + 28;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    parts.push(`<text x="${lx}" y="${ly}" text-anchor="middle" font-size="13" font-weight="700" fill="#1F2937">${escapeXml(d.label)}</text>`);
  });

  // 범례 (우측 카드)
  const legendX = 460;
  let legendY = 110;
  const swatchSize = 14;
  for (const d of data) {
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
    parts.push(`<rect x="${legendX}" y="${legendY - swatchSize / 2 - 2}" width="${swatchSize}" height="${swatchSize}" rx="3" fill="${d.color}" stroke="${d.color}" stroke-width="0.5"/>`);
    parts.push(`<text x="${legendX + swatchSize + 10}" y="${legendY + 1}" font-size="13" font-weight="600" fill="#1F2937">${escapeXml(d.label)}</text>`);
    parts.push(`<text x="${legendX + swatchSize + 10}" y="${legendY + 17}" font-size="11" fill="#94A3B8" font-weight="500">${d.value}문항 · ${pct}%</text>`);
    legendY += 40;
  }

  return svgWrap(parts.join('\n'));
}

// ── 출제 영역 + 능력 영역 통합 레이더 차트 (좌우 배치) ──

const COMBINED_WIDTH = 1250;
const COMBINED_HEIGHT = 550;

export function generateCombinedRadarSvg(
  distribution: Record<string, number>,
  questions: AnalyzedQuestion[],
): string {
  const parts: string[] = [];

  // ── defs: 좌·우 다각형 그라데이션 + 섀도우 ──
  parts.push(`<defs>` +
    `<radialGradient id="grad-combined-type" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="rgba(99,102,241,0.35)"/>` +
      `<stop offset="100%" stop-color="rgba(99,102,241,0.05)"/>` +
    `</radialGradient>` +
    `<radialGradient id="grad-combined-ability" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="rgba(139,92,246,0.35)"/>` +
      `<stop offset="100%" stop-color="rgba(139,92,246,0.05)"/>` +
    `</radialGradient>` +
    `<filter id="combined-shadow" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>` +
      `<feOffset dx="0" dy="1.5"/>` +
      `<feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>` +
      `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>` +
  `</defs>`);

  // ── 좌측: 출제 영역 분포 (5각형) ──
  const types = ['number', 'change_relation', 'shape_measure', 'data_possibility'] as const;
  const typeData = types.map((t) => ({
    key: t,
    label: QUESTION_TYPE_LABELS[t] || t,
    value: distribution[t] || 0,
    color: QUESTION_TYPE_COLORS[t] || '#94A3B8',
  }));

  const typeTotal = typeData.reduce((s, d) => s + d.value, 0);
  const typeMax = Math.max(...typeData.map((d) => d.value), 1);

  const lcx = 260, lcy = 285, lRadius = 143;
  const tn = typeData.length;
  const tAngleStep = (2 * Math.PI) / tn;
  const startOffset = -Math.PI / 2;

  // 좌측 제목 (강조 라인 + 큰 글씨)
  parts.push(`<rect x="40" y="32" width="4" height="22" rx="2" fill="#6366F1"/>`);
  parts.push(`<text x="56" y="50" font-size="20" font-weight="700" fill="#1F2937">출제 영역 분포</text>`);

  // 좌측 배경 그리드 (3단계, 외곽 더 진하게)
  for (const scale of [0.33, 0.66, 1.0]) {
    const r = lRadius * scale;
    const points = typeData.map((_, i) => {
      const angle = startOffset + i * tAngleStep;
      return `${lcx + r * Math.cos(angle)},${lcy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${points}" fill="none" stroke="#E5E7EB" stroke-width="${scale === 1.0 ? 1.5 : 1}"/>`);
  }

  // 좌측 축 선
  for (let i = 0; i < tn; i++) {
    const angle = startOffset + i * tAngleStep;
    parts.push(`<line x1="${lcx}" y1="${lcy}" x2="${lcx + lRadius * Math.cos(angle)}" y2="${lcy + lRadius * Math.sin(angle)}" stroke="#E5E7EB" stroke-width="1"/>`);
  }

  // 좌측 데이터 다각형 (그라데이션 + 섀도우)
  if (typeTotal > 0) {
    const dp = typeData.map((d, i) => {
      const angle = startOffset + i * tAngleStep;
      const r = (d.value / typeMax) * lRadius;
      return `${lcx + r * Math.cos(angle)},${lcy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${dp}" fill="url(#grad-combined-type)" stroke="#6366F1" stroke-width="3" stroke-linejoin="round" filter="url(#combined-shadow)"/>`);

    typeData.forEach((d, i) => {
      const angle = startOffset + i * tAngleStep;
      const r = (d.value / typeMax) * lRadius;
      const px = lcx + r * Math.cos(angle);
      const py = lcy + r * Math.sin(angle);
      parts.push(`<circle cx="${px}" cy="${py}" r="7" fill="${d.color}" stroke="white" stroke-width="3"/>`);
      if (d.value > 0) {
        parts.push(`<text x="${px}" y="${py - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#1F2937">${d.value}</text>`);
      }
    });
  }

  // 좌측 라벨 (더 크고 강조)
  typeData.forEach((d, i) => {
    const angle = startOffset + i * tAngleStep;
    const labelR = lRadius + 32;
    const lx = lcx + labelR * Math.cos(angle);
    const ly = lcy + labelR * Math.sin(angle);
    const pct = typeTotal > 0 ? Math.round((d.value / typeTotal) * 100) : 0;
    parts.push(`<text x="${lx}" y="${ly - 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#1F2937">${escapeXml(d.label)}</text>`);
    parts.push(`<text x="${lx}" y="${ly + 12}" text-anchor="middle" font-size="11" fill="#94A3B8" font-weight="500">${d.value}문항 · ${pct}%</text>`);
  });

  // ── 구분선 (더 우아하게) ──
  parts.push(`<line x1="625" y1="80" x2="625" y2="490" stroke="#E5E7EB" stroke-width="1.5" stroke-dasharray="6,6"/>`);

  // ── 우측: 능력 영역 분포 (4각형) ──
  const abilityKeys = ['calculation', 'understanding', 'problem_solving', 'reasoning'] as const;
  const counts: Record<string, number> = {};
  for (const key of abilityKeys) counts[key] = 0;
  for (const q of questions) {
    const rawDomain = q.ability_domain || TYPE_TO_DOMAIN[q.question_type] || 'calculation';
    const domain = String(rawDomain).toLowerCase().replace(/-/g, '_');
    if (domain in counts) counts[domain]++;
  }

  const abilityData = abilityKeys.map((key) => ({
    key,
    label: ABILITY_DOMAIN_LABELS[key] || key,
    value: counts[key] || 0,
    color: ABILITY_DOMAIN_COLORS[key] || '#94A3B8',
  }));

  const abilityTotal = abilityData.reduce((s, d) => s + d.value, 0);
  const abilityMax = Math.max(...abilityData.map((d) => d.value), 1);

  const rcx = 885, rcy = 285, rRadius = 143;
  const an = abilityData.length;
  const aAngleStep = (2 * Math.PI) / an;

  // 우측 제목 (강조 라인 + 큰 글씨)
  parts.push(`<rect x="665" y="32" width="4" height="22" rx="2" fill="#8B5CF6"/>`);
  parts.push(`<text x="681" y="50" font-size="20" font-weight="700" fill="#1F2937">능력 영역 분포</text>`);

  // 우측 배경 그리드
  for (const scale of [0.33, 0.66, 1.0]) {
    const r = rRadius * scale;
    const points = abilityData.map((_, i) => {
      const angle = startOffset + i * aAngleStep;
      return `${rcx + r * Math.cos(angle)},${rcy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${points}" fill="none" stroke="#E5E7EB" stroke-width="${scale === 1.0 ? 1.5 : 1}"/>`);
  }

  // 우측 축 선
  for (let i = 0; i < an; i++) {
    const angle = startOffset + i * aAngleStep;
    parts.push(`<line x1="${rcx}" y1="${rcy}" x2="${rcx + rRadius * Math.cos(angle)}" y2="${rcy + rRadius * Math.sin(angle)}" stroke="#E5E7EB" stroke-width="1"/>`);
  }

  // 우측 데이터 다각형 (그라데이션 + 섀도우)
  if (abilityTotal > 0) {
    const dp = abilityData.map((d, i) => {
      const angle = startOffset + i * aAngleStep;
      const r = (d.value / abilityMax) * rRadius;
      return `${rcx + r * Math.cos(angle)},${rcy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${dp}" fill="url(#grad-combined-ability)" stroke="#8B5CF6" stroke-width="3" stroke-linejoin="round" filter="url(#combined-shadow)"/>`);

    abilityData.forEach((d, i) => {
      const angle = startOffset + i * aAngleStep;
      const r = (d.value / abilityMax) * rRadius;
      const px = rcx + r * Math.cos(angle);
      const py = rcy + r * Math.sin(angle);
      parts.push(`<circle cx="${px}" cy="${py}" r="7" fill="${d.color}" stroke="white" stroke-width="3"/>`);
      if (d.value > 0) {
        parts.push(`<text x="${px}" y="${py - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#1F2937">${d.value}</text>`);
      }
    });
  }

  // 우측 라벨 (더 크고 강조)
  abilityData.forEach((d, i) => {
    const angle = startOffset + i * aAngleStep;
    const labelR = rRadius + 32;
    const lx = rcx + labelR * Math.cos(angle);
    const ly = rcy + labelR * Math.sin(angle);
    const pct = abilityTotal > 0 ? Math.round((d.value / abilityTotal) * 100) : 0;
    parts.push(`<text x="${lx}" y="${ly - 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#1F2937">${escapeXml(d.label)}</text>`);
    parts.push(`<text x="${lx}" y="${ly + 12}" text-anchor="middle" font-size="11" fill="#94A3B8" font-weight="500">${d.value}문항 · ${pct}%</text>`);
  });

  return svgWrap(parts.join('\n'), COMBINED_WIDTH, COMBINED_HEIGHT);
}

// ── 단원별 출제 현황 가로 바 차트 ──

export function generateTopicBarSvg(
  questions: AnalyzedQuestion[],
): string {
  // 단원별 집계
  const topicStats: Record<string, { count: number; pts: number }> = {};
  for (const q of questions) {
    // topic에서 마지막 소단원만 추출 (예: "실수와 그 연산 > 근호를 포함한 식의 사칙계산" → "근호를 포함한 식의 사칙계산")
    const raw = q.topic || '미분류';
    const parts = raw.split('>').map((s) => s.trim());
    const shortTopic = parts[parts.length - 1];
    if (!topicStats[shortTopic]) topicStats[shortTopic] = { count: 0, pts: 0 };
    topicStats[shortTopic].count++;
    topicStats[shortTopic].pts += q.points || 0;
  }

  const sorted = Object.entries(topicStats)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 8); // 최대 8개

  if (sorted.length === 0) {
    return svgWrap('<text x="400" y="250" text-anchor="middle" font-size="18" fill="#4B5563">데이터 없음</text>');
  }

  const maxCount = Math.max(...sorted.map(([, s]) => s.count));
  // 가장 긴 단원명 기준으로 왼쪽 여백 동적 계산 (한글은 약 11px/char @font-size 11)
  const maxTopicLen = Math.max(...sorted.map(([t]) => t.length));
  const barAreaX = Math.max(170, maxTopicLen * 11 + 24);
  const barAreaWidth = Math.max(150, CHART_WIDTH - barAreaX - 140);
  // 실제 사용 값은 아래 barHeightUp/barGapUp/startYUp (업그레이드 버전 — 그라데이션+섀도우+큰 폰트)

  const svgParts: string[] = [];

  // ── defs: 막대별 그라데이션 + 섀도우 ──
  const COLORS = ['#6366F1', '#8B5CF6', '#A78BFA', '#C084FC', '#D946EF', '#EC4899', '#F472B6', '#F9A8D4'];
  const defs: string[] = ['<defs>'];
  COLORS.forEach((c, i) => {
    const light = lightenColor(c, 0.25);
    defs.push(
      `<linearGradient id="grad-topic-${i}" x1="0%" y1="0%" x2="100%" y2="0%">` +
        `<stop offset="0%" stop-color="${c}"/>` +
        `<stop offset="100%" stop-color="${light}"/>` +
      `</linearGradient>`,
    );
  });
  defs.push(`<filter id="topic-shadow" x="-5%" y="-50%" width="110%" height="200%">` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>` +
    `<feOffset dx="0" dy="1"/>` +
    `<feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>` +
    `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
  `</filter>`);
  defs.push('</defs>');
  svgParts.push(defs.join(''));

  // 제목 (좌측 위 + 강조 라인)
  svgParts.push(`<rect x="32" y="22" width="4" height="20" rx="2" fill="#6366F1"/>`);
  svgParts.push(`<text x="46" y="38" font-size="18" font-weight="700" fill="#1F2937">단원별 출제 현황</text>`);

  // 바 height 증가 + gap 증가
  const barHeightUp = 26;
  const barGapUp = 10;
  const startYUp = 60;

  sorted.forEach(([topic, stats], i) => {
    const y = startYUp + i * (barHeightUp + barGapUp);
    const barW = (stats.count / maxCount) * barAreaWidth;

    // 단원명 (왼쪽) — 더 큰 폰트
    svgParts.push(`<text x="${barAreaX - 8}" y="${y + barHeightUp / 2 + 5}" text-anchor="end" font-size="13" font-weight="600" fill="#1F2937">${escapeXml(topic)}</text>`);

    // 배경 트랙 (전체 너비, 회색)
    svgParts.push(`<rect x="${barAreaX}" y="${y}" width="${barAreaWidth}" height="${barHeightUp}" rx="4" fill="#F1F5F9"/>`);

    // 바 (그라데이션 + 섀도우)
    svgParts.push(`<rect x="${barAreaX}" y="${y}" width="${Math.max(barW, 4)}" height="${barHeightUp}" rx="4" fill="url(#grad-topic-${i % COLORS.length})" filter="url(#topic-shadow)"/>`);

    // 값 라벨 (더 크고 색상 강조)
    svgParts.push(`<text x="${barAreaX + barW + 10}" y="${y + barHeightUp / 2 + 5}" font-size="13" font-weight="700" fill="#1F2937">${stats.count}문항</text>`);
    svgParts.push(`<text x="${barAreaX + barW + 10 + 50}" y="${y + barHeightUp / 2 + 5}" font-size="11" fill="#94A3B8" font-weight="500">· ${formatPoints(stats.pts)}점</text>`);
  });

  const totalHeight = startYUp + sorted.length * (barHeightUp + barGapUp) + 24;
  const totalWidth = Math.max(CHART_WIDTH, barAreaX + barAreaWidth + 150);
  return svgWrap(svgParts.join('\n'), totalWidth, Math.max(totalHeight, 320));
}

// ── 한글 폰트 로딩 (Vercel 서버리스 대응) ──
// Google Fonts CSS 파싱 대신 직접 CDN에서 OTF 바이너리 다운로드
// fontDirs(디렉토리 스캔) 대신 fontFiles(정확한 파일 경로) 사용

const FONT_DIR = join(tmpdir(), 'mathlab-chart-fonts-v7');
const MIN_FONT_SIZE = 100_000; // TTF는 최소 100KB 이상

// Noto Sans KR OTF — resvg는 woff2를 지원하지 않으므로 OTF/TTF 사용
// Google Fonts CDN에서 OTF 직접 다운로드 (확장자 일치 필수)
const FONT_SOURCES = [
  {
    file: 'NotoSansCJKkr-Regular.otf',
    url: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf',
  },
  {
    file: 'NotoSansCJKkr-Bold.otf',
    url: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Sans/OTF/Korean/NotoSansCJKkr-Bold.otf',
  },
];

function isFontValid(filePath: string): boolean {
  try {
    return existsSync(filePath) && statSync(filePath).size > MIN_FONT_SIZE;
  } catch {
    return false;
  }
}

async function downloadFont(url: string, destPath: string): Promise<boolean> {
  try {
    console.log(`[chart-fonts] Downloading: ${url}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.error(`[chart-fonts] HTTP ${res.status} from ${url}`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_FONT_SIZE) {
      console.error(`[chart-fonts] Too small (${buf.length}B) from ${url}`);
      return false;
    }
    writeFileSync(destPath, buf);
    console.log(`[chart-fonts] OK ${buf.length} bytes → ${destPath}`);
    return true;
  } catch (err) {
    console.error(`[chart-fonts] Failed ${url}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

// 모듈 레벨 캐시 — 같은 인스턴스의 동시·후속 호출은 첫 다운로드 Promise를 재사용.
// Vercel Serverless 인스턴스는 격리되므로 cross-request stale 우려 없음.
// 실패 시 null 로 되돌려 다음 호출에서 재시도 가능.
let fontsReadyPromise: Promise<string[]> | null = null;

async function ensureFonts(): Promise<string[]> {
  if (fontsReadyPromise) return fontsReadyPromise;

  fontsReadyPromise = (async () => {
    if (!existsSync(FONT_DIR)) mkdirSync(FONT_DIR, { recursive: true });

    const fontPaths: string[] = [];

    await Promise.all(FONT_SOURCES.map(async (source) => {
      const destPath = join(FONT_DIR, source.file);
      if (!isFontValid(destPath)) {
        await downloadFont(source.url, destPath);
      }
      if (isFontValid(destPath)) {
        fontPaths.push(destPath);
      }
    }));

    console.log(`[chart-fonts] ${fontPaths.length}/${FONT_SOURCES.length} fonts ready in ${FONT_DIR}`);
    if (fontPaths.length === 0) {
      console.error('[chart-fonts] No fonts available! Charts will have no text.');
      fontsReadyPromise = null; // 다음 호출 시 재다운로드 시도
    }

    return fontPaths;
  })();

  return fontsReadyPromise;
}

// ── SVG → PNG 변환 (resvg — 한글 폰트 지원) ──

export async function svgToPng(svg: string, width = CHART_WIDTH): Promise<Buffer> {
  const fontFiles = await ensureFonts();

  const Resvg = getResvg();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width * 2 },
    font: {
      fontFiles,                          // 정확한 파일 경로 (fontDirs 스캔 대신)
      loadSystemFonts: true,              // 로컬 dev에서 시스템 폰트도 활용
      defaultFontFamily: 'Noto Sans KR',
      sansSerifFamily: 'Noto Sans KR',
    },
  });

  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

// ── 변별력 분석 차트 (DiscriminationSection 공식과 동일) ──

const DISCRIM_GRADES = [
  { key: 'excellent', label: '우수', color: '#22C55E', desc: '실력 차이가 잘 드러남' },
  { key: 'good', label: '양호', color: '#3B82F6', desc: '적절한 평가 가능' },
  { key: 'fair', label: '보통', color: '#F59E0B', desc: '점수 차이 영향 적음' },
  { key: 'poor', label: '주의', color: '#EF4444', desc: '실력 차이 드러나지 않음' },
] as const;

function calcDiscriminationScore(q: AnalyzedQuestion): number {
  const points = q.points || 3;
  const dRaw = String(q.difficulty);
  const dMap: Record<string, string> = { concept: '1', pattern: '2', reasoning: '4', creative: '5' };
  const nd = dMap[dRaw] || dRaw;
  const mult = ({ '1': 0.3, '2': 0.5, '3': 0.65, '4': 0.8, '5': 1.0 } as Record<string, number>)[nd] || 0.5;
  let base = (points * mult) / 10 * 100;
  if (q.question_format === 'essay') base *= 1.2;
  if ((nd === '1' || nd === '2') && points >= 5) base *= 0.7;
  if ((nd === '4' || nd === '5') && points >= 4) base *= 1.15;
  return Math.min(100, Math.max(0, Math.round(base)));
}

function gradeOf(score: number): typeof DISCRIM_GRADES[number]['key'] {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export function generateDiscriminationSvg(questions: AnalyzedQuestion[]): string {
  if (questions.length === 0) {
    return svgWrap('<text x="340" y="210" text-anchor="middle" font-size="18" fill="#4B5563">데이터 없음</text>');
  }

  const scores = questions.map(calcDiscriminationScore);
  const avg = Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);
  const counts: Record<string, number> = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const s of scores) counts[gradeOf(s)]++;
  const total = scores.length;

  const overallGrade = DISCRIM_GRADES.find((g) => g.key === gradeOf(avg))!;

  const items: string[] = [];

  // ── defs: 게이지 그라데이션 + 막대 그라데이션 + 섀도우 ──
  const lightOverall = lightenColor(overallGrade.color, 0.3);
  const defs: string[] = ['<defs>'];
  defs.push(
    `<linearGradient id="grad-gauge" x1="0%" y1="0%" x2="0%" y2="100%">` +
      `<stop offset="0%" stop-color="${lightOverall}"/>` +
      `<stop offset="100%" stop-color="${overallGrade.color}"/>` +
    `</linearGradient>`,
  );
  DISCRIM_GRADES.forEach((g, i) => {
    const light = lightenColor(g.color, 0.3);
    defs.push(
      `<linearGradient id="grad-discrim-${i}" x1="0%" y1="0%" x2="0%" y2="100%">` +
        `<stop offset="0%" stop-color="${light}"/>` +
        `<stop offset="100%" stop-color="${g.color}"/>` +
      `</linearGradient>`,
    );
  });
  defs.push(
    `<filter id="discrim-shadow" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>` +
      `<feOffset dx="0" dy="2"/>` +
      `<feComponentTransfer><feFuncA type="linear" slope="0.18"/></feComponentTransfer>` +
      `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>`,
  );
  defs.push('</defs>');
  items.push(defs.join(''));

  // 제목 (좌측 위 + 강조 라인)
  items.push(`<rect x="32" y="22" width="4" height="20" rx="2" fill="${overallGrade.color}"/>`);
  items.push(`<text x="46" y="38" font-size="18" font-weight="700" fill="#1F2937">변별력 분석</text>`);

  // 좌측: 원형 게이지 (평균 변별력 지수) — 크기 확대
  const gcx = 175, gcy = 235, gR = 88, gInnerR = 62;
  const ratio = avg / 100;
  const endAngle = -Math.PI / 2 + ratio * 2 * Math.PI;
  const largeArc = ratio > 0.5 ? 1 : 0;
  // 배경 원 (더 옅게)
  items.push(`<circle cx="${gcx}" cy="${gcy}" r="${gR}" fill="${overallGrade.color}0F" stroke="${overallGrade.color}30" stroke-width="1.5"/>`);
  // 도넛 호 (실제 평균, 그라데이션 + 섀도우)
  if (ratio > 0.001) {
    const sx = gcx + gR * Math.cos(-Math.PI / 2);
    const sy = gcy + gR * Math.sin(-Math.PI / 2);
    const ex = gcx + gR * Math.cos(endAngle);
    const ey = gcy + gR * Math.sin(endAngle);
    const ix2 = gcx + gInnerR * Math.cos(endAngle);
    const iy2 = gcy + gInnerR * Math.sin(endAngle);
    const ix1 = gcx + gInnerR * Math.cos(-Math.PI / 2);
    const iy1 = gcy + gInnerR * Math.sin(-Math.PI / 2);
    items.push(`<path d="M${sx},${sy} A${gR},${gR} 0 ${largeArc},1 ${ex},${ey} L${ix2},${iy2} A${gInnerR},${gInnerR} 0 ${largeArc},0 ${ix1},${iy1} Z" fill="url(#grad-gauge)" filter="url(#discrim-shadow)" stroke="white" stroke-width="2"/>`);
  }
  // 중앙 숫자 (더 크게)
  items.push(`<text x="${gcx}" y="${gcy - 14}" text-anchor="middle" font-size="11" fill="#94A3B8" font-weight="500" letter-spacing="0.1em">AVERAGE</text>`);
  items.push(`<text x="${gcx}" y="${gcy + 14}" text-anchor="middle" font-size="40" font-weight="800" fill="${overallGrade.color}">${avg}</text>`);
  items.push(`<text x="${gcx}" y="${gcy + 32}" text-anchor="middle" font-size="11" fill="#64748B" font-weight="600">/ 100</text>`);
  // 게이지 아래 등급 라벨 (더 크고 강조)
  items.push(`<rect x="${gcx - 44}" y="${gcy + gR + 18}" width="88" height="28" rx="14" fill="${overallGrade.color}" filter="url(#discrim-shadow)"/>`);
  items.push(`<text x="${gcx}" y="${gcy + gR + 37}" text-anchor="middle" font-size="14" font-weight="800" fill="white">${overallGrade.label}</text>`);

  // 우측: 4등급 막대 차트 (그라데이션 + 섀도우)
  const chartLeft = 360;
  const chartTop = 80;
  const chartW = 280;
  const chartH = 230;
  const barAreaH = chartH - 64;
  const barW = 48;
  const barGap = (chartW - 4 * barW) / 5;
  const maxCount = Math.max(...Object.values(counts), 1);

  // Y축 가이드 라인 (5개 눈금)
  for (let i = 0; i <= 4; i++) {
    const y = chartTop + barAreaH - (i / 4) * barAreaH;
    items.push(`<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartW}" y2="${y}" stroke="#E5E7EB" stroke-width="${i === 0 ? 1.5 : 1}" stroke-dasharray="${i === 0 ? '0' : '3,3'}"/>`);
  }

  // 4개 막대 (그라데이션 + 섀도우)
  DISCRIM_GRADES.forEach((g, idx) => {
    const c = counts[g.key];
    const pct = total > 0 ? Math.round((c / total) * 100) : 0;
    const bx = chartLeft + barGap + idx * (barW + barGap);
    const bh = barAreaH * (c / maxCount);
    const by = chartTop + barAreaH - bh;
    items.push(`<rect x="${bx}" y="${by}" width="${barW}" height="${Math.max(bh, 2)}" rx="4" fill="url(#grad-discrim-${idx})" filter="url(#discrim-shadow)"/>`);
    // 막대 위 숫자
    if (c > 0) {
      items.push(`<text x="${bx + barW / 2}" y="${by - 8}" text-anchor="middle" font-size="14" font-weight="800" fill="${g.color}">${c}</text>`);
    }
    // 라벨 (등급명)
    items.push(`<text x="${bx + barW / 2}" y="${chartTop + barAreaH + 20}" text-anchor="middle" font-size="13" font-weight="700" fill="#1F2937">${g.label}</text>`);
    // 퍼센트
    items.push(`<text x="${bx + barW / 2}" y="${chartTop + barAreaH + 36}" text-anchor="middle" font-size="11" fill="#94A3B8" font-weight="500">${pct}%</text>`);
  });

  // 우측 상단 캡션
  items.push(`<text x="${chartLeft + chartW}" y="${chartTop - 14}" text-anchor="end" font-size="12" fill="#64748B" font-weight="600">총 ${total}문항</text>`);

  // 하단 설명
  items.push(`<text x="${chartLeft + chartW / 2}" y="${chartTop + chartH + 16}" text-anchor="middle" font-size="10" fill="#94A3B8">변별력 = 난이도·배점·형식 기반 정성 지수 (0~100)</text>`);

  return svgWrap(items.join('\n'));
}

// ── 전체 차트 이미지 생성 (한번에) ──

// 새 글은 분석 화면과 동일하게 difficulty + abilityRadar + topicBar + discrimination 4종 차트 사용.
// typeRadar/combinedRadar는 옛 글 호환을 위해 chart 라우트에서 서빙은 유지하지만 새로 생성하지 않음.
export interface ChartImages {
  difficulty: string; // base64 PNG
  abilityRadar: string;
  topicBar: string;
  discrimination: string;  // 신규
}

export async function generateAllChartImages(
  summary: { difficulty_distribution: Record<string, number>; type_distribution: Record<string, number> },
  questions: AnalyzedQuestion[],
): Promise<ChartImages> {
  const diffSvg = generateDifficultyDonutSvg(summary.difficulty_distribution);
  const abilityRadarSvg = generateAbilityRadarSvg(questions);
  const topicBarSvg = generateTopicBarSvg(questions);
  const discrimSvg = generateDiscriminationSvg(questions);

  const [diffPng, abilityPng, topicBarPng, discrimPng] = await Promise.all([
    svgToPng(diffSvg),
    svgToPng(abilityRadarSvg),
    svgToPng(topicBarSvg),
    svgToPng(discrimSvg),
  ]);

  return {
    difficulty: diffPng.toString('base64'),
    abilityRadar: abilityPng.toString('base64'),
    topicBar: topicBarPng.toString('base64'),
    discrimination: discrimPng.toString('base64'),
  };
}
