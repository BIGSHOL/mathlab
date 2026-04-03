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
} from './constants';
import type { AnalyzedQuestion } from './types';

// ── SVG 유틸 ──

const CHART_WIDTH = 680;
const CHART_HEIGHT = 420;
const FONT_FAMILY = "'Noto Sans KR', sans-serif";

function svgWrap(inner: string, width = CHART_WIDTH, height = CHART_HEIGHT): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>text { font-family: ${FONT_FAMILY}; }</style>
<rect width="${width}" height="${height}" fill="white" rx="12"/>
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
  })).filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return svgWrap('<text x="400" y="250" text-anchor="middle" font-size="18" fill="#4B5563">데이터 없음</text>');

  const cx = 240, cy = 200, outerR = 130, innerR = 70;
  let startAngle = -Math.PI / 2;
  const arcs: string[] = [];

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

    arcs.push(`<path d="M${x1},${y1} A${outerR},${outerR} 0 ${largeArc},1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${largeArc},0 ${x4},${y4} Z" fill="${d.color}" stroke="white" stroke-width="2"/>`);

    // 퍼센트 라벨
    const midAngle = startAngle + sliceAngle / 2;
    const labelR = (outerR + innerR) / 2;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const pct = Math.round((d.value / total) * 100);
    if (pct >= 5) {
      arcs.push(`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="600" fill="white">${pct}%</text>`);
    }

    startAngle = endAngle;
  }

  // 중앙 텍스트
  arcs.push(`<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="11" fill="#4B5563">총</text>`);
  arcs.push(`<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="20" font-weight="700" fill="#374151">${total}문항</text>`);

  // 제목
  arcs.push(`<text x="${cx}" y="28" text-anchor="middle" font-size="16" font-weight="700" fill="#374151">난이도 분포</text>`);

  // 범례
  const legendX = 440;
  let legendY = 80;
  for (const d of data) {
    const pct = Math.round((d.value / total) * 100);
    arcs.push(`<rect x="${legendX}" y="${legendY - 6}" width="12" height="12" rx="2" fill="${d.color}"/>`);
    arcs.push(`<text x="${legendX + 18}" y="${legendY + 3}" font-size="11" fill="#374151">${escapeXml(d.label)}</text>`);
    arcs.push(`<text x="${legendX + 18}" y="${legendY + 17}" font-size="10" fill="#4B5563">${d.value}문항 (${pct}%)</text>`);
    legendY += 38;
  }

  return svgWrap(arcs.join('\n'));
}

// ── 유형 분포 레이더 차트 ──

export function generateTypeRadarSvg(
  distribution: Record<string, number>,
): string {
  const types = ['number', 'algebra', 'function', 'geometry', 'statistics'] as const;
  const data = types.map((t) => ({
    key: t,
    label: QUESTION_TYPE_LABELS[t] || t,
    value: distribution[t] || 0,
    color: QUESTION_TYPE_COLORS[t] || '#94A3B8',
  }));

  const total = data.reduce((s, d) => s + d.value, 0);
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const cx = 210, cy = 190, radius = 110;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const startOffset = -Math.PI / 2;

  const parts: string[] = [];

  // 제목
  parts.push(`<text x="${cx}" y="28" text-anchor="middle" font-size="16" font-weight="700" fill="#374151">출제 영역 분포</text>`);

  // 배경 그리드 (3단계)
  for (const scale of [0.33, 0.66, 1.0]) {
    const r = radius * scale;
    const points = data.map((_, i) => {
      const angle = startOffset + i * angleStep;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${points}" fill="none" stroke="#E2E8F0" stroke-width="1"/>`);
  }

  // 축 선
  for (let i = 0; i < n; i++) {
    const angle = startOffset + i * angleStep;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E2E8F0" stroke-width="1"/>`);
  }

  // 데이터 다각형
  if (total > 0) {
    const dataPoints = data.map((d, i) => {
      const angle = startOffset + i * angleStep;
      const r = (d.value / maxVal) * radius;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${dataPoints}" fill="rgba(99,102,241,0.15)" stroke="#6366F1" stroke-width="2.5"/>`);

    // 데이터 점
    data.forEach((d, i) => {
      const angle = startOffset + i * angleStep;
      const r = (d.value / maxVal) * radius;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      parts.push(`<circle cx="${px}" cy="${py}" r="5" fill="${d.color}" stroke="white" stroke-width="2"/>`);
    });
  }

  // 라벨
  data.forEach((d, i) => {
    const angle = startOffset + i * angleStep;
    const labelR = radius + 25;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
    parts.push(`<text x="${lx}" y="${ly - 4}" text-anchor="middle" font-size="11" font-weight="600" fill="#374151">${escapeXml(d.label)}</text>`);
    parts.push(`<text x="${lx}" y="${ly + 9}" text-anchor="middle" font-size="10" fill="#4B5563">${d.value}문항 (${pct}%)</text>`);
  });

  // 범례 (오른쪽)
  const legendX = 390;
  let legendY = 100;
  for (const d of data) {
    parts.push(`<circle cx="${legendX + 5}" cy="${legendY}" r="4" fill="${d.color}"/>`);
    parts.push(`<text x="${legendX + 14}" y="${legendY + 3}" font-size="10" fill="#374151">${escapeXml(d.label)}: ${d.value}문항</text>`);
    legendY += 22;
  }

  return svgWrap(parts.join('\n'));
}

// ── 능력 영역 분포 레이더 차트 ──

export function generateAbilityRadarSvg(
  questions: AnalyzedQuestion[],
): string {
  const abilityKeys = ['calculation', 'understanding', 'problem_solving', 'reasoning'] as const;

  // 문항별 ability_domain 집계
  const counts: Record<string, number> = {};
  for (const key of abilityKeys) counts[key] = 0;
  for (const q of questions) {
    const domain = q.ability_domain || 'understanding';
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

  const cx = 210, cy = 190, radius = 110;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const startOffset = -Math.PI / 2;

  const parts: string[] = [];

  // 제목
  parts.push(`<text x="${cx}" y="28" text-anchor="middle" font-size="16" font-weight="700" fill="#374151">능력 영역 분포</text>`);

  // 배경 그리드 (3단계)
  for (const scale of [0.33, 0.66, 1.0]) {
    const r = radius * scale;
    const points = data.map((_, i) => {
      const angle = startOffset + i * angleStep;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${points}" fill="none" stroke="#E2E8F0" stroke-width="1"/>`);
  }

  // 축 선
  for (let i = 0; i < n; i++) {
    const angle = startOffset + i * angleStep;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E2E8F0" stroke-width="1"/>`);
  }

  // 데이터 다각형
  if (total > 0) {
    const dataPoints = data.map((d, i) => {
      const angle = startOffset + i * angleStep;
      const r = (d.value / maxVal) * radius;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    parts.push(`<polygon points="${dataPoints}" fill="rgba(139,92,246,0.15)" stroke="#8B5CF6" stroke-width="2.5"/>`);

    // 데이터 점
    data.forEach((d, i) => {
      const angle = startOffset + i * angleStep;
      const r = (d.value / maxVal) * radius;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      parts.push(`<circle cx="${px}" cy="${py}" r="5" fill="${d.color}" stroke="white" stroke-width="2"/>`);
    });
  }

  // 라벨
  data.forEach((d, i) => {
    const angle = startOffset + i * angleStep;
    const labelR = radius + 25;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    parts.push(`<text x="${lx}" y="${ly}" text-anchor="middle" font-size="12" font-weight="600" fill="#374151">${escapeXml(d.label)}</text>`);
  });

  // 범례 (오른쪽)
  const legendX = 390;
  let legendY = 100;
  for (const d of data) {
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
    parts.push(`<circle cx="${legendX + 5}" cy="${legendY}" r="4" fill="${d.color}"/>`);
    parts.push(`<text x="${legendX + 14}" y="${legendY + 3}" font-size="11" fill="#374151">${escapeXml(d.label)}</text>`);
    parts.push(`<text x="${legendX + 14}" y="${legendY + 17}" font-size="10" fill="#6B7280">${d.value}문항 (${pct}%)</text>`);
    legendY += 32;
  }

  return svgWrap(parts.join('\n'));
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
  const barHeight = 24, barGap = 8;
  const startY = 55;

  const svgParts: string[] = [];

  // 제목
  const chartCenterX = Math.round(barAreaX + barAreaWidth / 2);
  svgParts.push(`<text x="${chartCenterX}" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#374151">단원별 출제 현황</text>`);

  // 바 & 라벨
  const COLORS = ['#6366F1', '#8B5CF6', '#A78BFA', '#C084FC', '#D946EF', '#EC4899', '#F472B6', '#F9A8D4'];

  sorted.forEach(([topic, stats], i) => {
    const y = startY + i * (barHeight + barGap);
    const barW = (stats.count / maxCount) * barAreaWidth;
    const color = COLORS[i % COLORS.length];

    // 단원명 (왼쪽) — 전체 표시
    svgParts.push(`<text x="${barAreaX - 8}" y="${y + barHeight / 2 + 4}" text-anchor="end" font-size="11" fill="#374151">${escapeXml(topic)}</text>`);

    // 바
    svgParts.push(`<rect x="${barAreaX}" y="${y}" width="${Math.max(barW, 4)}" height="${barHeight}" rx="3" fill="${color}" opacity="0.85"/>`);

    // 값 라벨
    svgParts.push(`<text x="${barAreaX + barW + 8}" y="${y + barHeight / 2 + 4}" font-size="11" font-weight="600" fill="#374151">${stats.count}문항 (${stats.pts}점)</text>`);
  });

  const totalHeight = startY + sorted.length * (barHeight + barGap) + 20;
  const totalWidth = Math.max(CHART_WIDTH, barAreaX + barAreaWidth + 130);
  return svgWrap(svgParts.join('\n'), totalWidth, Math.max(totalHeight, 300));
}

// ── 한글 폰트 로딩 (Vercel 서버리스 대응) ──
// Google Fonts CSS 파싱 대신 직접 CDN에서 OTF 바이너리 다운로드
// fontDirs(디렉토리 스캔) 대신 fontFiles(정확한 파일 경로) 사용

const FONT_DIR = join(tmpdir(), 'mathlab-chart-fonts-v6');
const MIN_FONT_SIZE = 100_000; // TTF는 최소 100KB 이상

// Noto Sans KR TTF — resvg는 woff2를 지원하지 않으므로 반드시 TTF 사용
// Google Fonts CDN에서 TTF 직접 다운로드
const FONT_SOURCES = [
  {
    file: 'NotoSansKR-Regular.ttf',
    url: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf',
  },
  {
    file: 'NotoSansKR-Bold.ttf',
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

async function ensureFonts(): Promise<string[]> {
  if (!existsSync(FONT_DIR)) mkdirSync(FONT_DIR, { recursive: true });

  const fontPaths: string[] = [];

  await Promise.all(FONT_SOURCES.map(async (source) => {
    const destPath = join(FONT_DIR, source.file);

    // 항상 실제 파일 존재 + 크기 검증 (module-level 캐시 사용 안 함)
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
  }

  return fontPaths;
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

// ── 전체 차트 이미지 생성 (한번에) ──

export interface ChartImages {
  difficulty: string; // base64 PNG
  typeRadar: string;
  abilityRadar: string;
  topicBar: string;
}

export async function generateAllChartImages(
  summary: { difficulty_distribution: Record<string, number>; type_distribution: Record<string, number> },
  questions: AnalyzedQuestion[],
): Promise<ChartImages> {
  const [diffSvg, radarSvg, abilityRadarSvg, barSvg] = [
    generateDifficultyDonutSvg(summary.difficulty_distribution),
    generateTypeRadarSvg(summary.type_distribution),
    generateAbilityRadarSvg(questions),
    generateTopicBarSvg(questions),
  ];

  const [diffPng, radarPng, abilityPng, barPng] = await Promise.all([
    svgToPng(diffSvg),
    svgToPng(radarSvg),
    svgToPng(abilityRadarSvg),
    svgToPng(barSvg),
  ]);

  return {
    difficulty: diffPng.toString('base64'),
    typeRadar: radarPng.toString('base64'),
    abilityRadar: abilityPng.toString('base64'),
    topicBar: barPng.toString('base64'),
  };
}
