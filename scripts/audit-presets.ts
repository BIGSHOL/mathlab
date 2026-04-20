/**
 * 프리셋 전수 감사 — 209개 curriculum preset + shape-presets 를 렌더하여
 * 실패/의심 사례를 추출합니다.
 *
 * 검사 항목:
 *   - renderDiagram이 null/빈 문자열을 반환
 *   - 런타임 예외 발생
 *   - 핵심 요소 누락 (도형 타입별 최소 기대 요소 불만족)
 *   - bbox가 0 (파라미터로 도형을 구성하지 못함)
 */

import { renderDiagram as renderDiagramParam } from '../src/lib/utils/svg-diagrams/index';
import { renderDiagram as renderDiagramSpec } from '../src/lib/diagram/renderer';
import { ALL_PRESETS } from '../src/lib/diagram-presets/index';
import { SHAPE_PRESETS } from '../src/lib/diagram-presets/shape-presets';

type Result = {
  id: string;
  name: string;
  type: string;
  status: 'OK' | 'FAIL' | 'WARN';
  reason?: string;
  svgLen?: number;
};

const results: Result[] = [];

// 타입별 핵심 요소 기대치
const EXPECTED_ELEMENTS: Record<string, RegExp[]> = {
  triangle: [/<polygon/, /stroke/],
  quadrilateral: [/<polygon/],
  polygon: [/<polygon/],
  regular_polygon: [/<polygon/],
  circle: [/<circle/],
  coordinate_plane: [/<line/, /stroke/],
  function_graph: [/<line|<path/],
  histogram: [/<rect|<polygon|<line/],
  scatter_plot: [/<circle/],
  stem_leaf: [/<text|<rect|<line/],
  tree_diagram: [/<line/, /<text/],
  venn_diagram: [/<circle/],
  solid_figure: [/<path|<polygon|<ellipse|<line/],
  net_diagram: [/<polygon|<rect|<line/],
  number_line: [/<line/],
  fraction_circle: [/<circle|<path/],
  fraction_rect: [/<rect/],
  place_value: [/<rect/],
  dot_array: [/<circle|<rect/],
  flow_chart: [/<rect|<polygon|<text/],
  bar_chart: [/<rect|<line/],
  line_graph: [/<line|<polyline/],
  picture_graph: [/<rect|<text/],
  pie_chart: [/<path|<circle/],
  band_chart: [/<rect/],
  angle_figure: [/<line/],
  clock_face: [/<circle/, /<line/],
};

/** KaTeX 경고 캡처 — console.warn을 임시 후킹 */
let capturedWarnings: string[] = [];
const originalWarn = console.warn;
const originalError = console.error;
function startWarnCapture() {
  capturedWarnings = [];
  console.warn = (...args: unknown[]) => {
    capturedWarnings.push(args.map(a => String(a)).join(' '));
  };
  console.error = (...args: unknown[]) => {
    capturedWarnings.push(args.map(a => String(a)).join(' '));
  };
}
function stopWarnCapture(): string[] {
  console.warn = originalWarn;
  console.error = originalError;
  return capturedWarnings;
}

function audit(id: string, name: string, type: string, params: Record<string, unknown>, engine: 'param' | 'spec' = 'param'): Result {
  try {
    startWarnCapture();
    const svg = engine === 'spec'
      ? renderDiagramSpec(params as never)
      : renderDiagramParam({ type: type as never, params });
    const warns = stopWarnCapture();

    // 의미있는 KaTeX 경고만 필터링 (체크 규칙 완화)
    const katexIssues = warns.filter(w =>
      w.includes('LaTeX-incompatible') || w.includes('No character metrics') || w.includes('ParseError'),
    );

    if (!svg || svg.length < 40) {
      return { id, name, type, status: 'FAIL', reason: 'empty/null SVG' };
    }
    // KaTeX 에러가 있으면 WARN으로 분류 (렌더는 되지만 불완전 표시)
    if (katexIssues.length > 0) {
      // 중복 제거 + 대표 경고 하나만 노출
      const sample = katexIssues[0].slice(0, 120);
      return { id, name, type, status: 'WARN', reason: `KaTeX: ${sample}`, svgLen: svg.length };
    }

    // 기능 누락 검사: 파라미터에는 있는데 SVG에 흔적이 없는 기능
    const p = params as Record<string, unknown>;
    const missingFeatures: string[] = [];

    // 직각 표시 — DiagramParam은 <polyline>, DiagramSpec은 <path d=M...L...L>로 그려짐
    if (Array.isArray(p.rightAngleMarks) && p.rightAngleMarks.length > 0) {
      const hasPolyline = /<polyline[^>]*points/.test(svg);
      // 직각 path 패턴: M x y L ... L ... (3점)
      const rightAnglePathCount = (svg.match(/<path\s+d="M\s*[-\d.]+\s+[-\d.]+\s+L\s+[-\d.]+\s+[-\d.]+\s+L\s+[-\d.]+\s+[-\d.]+\s*"/g) || []).length;
      if (!hasPolyline && rightAnglePathCount === 0) {
        missingFeatures.push(`rightAngleMarks ${p.rightAngleMarks.length}개인데 마커 없음`);
      }
    }
    // 변 라벨(sides)
    if (Array.isArray(p.sides) && p.sides.length > 0 && type !== 'regular_polygon') {
      const labelCount = (svg.match(/<foreignObject/g) || []).length + (svg.match(/<text/g) || []).length;
      if (labelCount < (p.sides as unknown[]).length) {
        missingFeatures.push(`sides ${(p.sides as unknown[]).length}개인데 라벨 텍스트 ${labelCount}개`);
      }
    }
    // 각도(angles)
    if (Array.isArray(p.angles) && p.angles.length > 0) {
      const hasSome = /<foreignObject|<text/.test(svg);
      if (!hasSome) missingFeatures.push(`angles 있는데 텍스트 없음`);
    }
    // 꼭짓점 라벨 (vertices[].label)
    if (Array.isArray(p.vertices)) {
      const withLabels = (p.vertices as Array<{ label?: string }>).filter(v => v.label && v.label.length > 0);
      if (withLabels.length > 0) {
        const hasText = /<foreignObject|<text/.test(svg);
        if (!hasText) missingFeatures.push(`vertex labels 있는데 텍스트 없음`);
      }
    }

    if (missingFeatures.length > 0) {
      return { id, name, type, status: 'WARN', reason: `기능 의심: ${missingFeatures.join(' / ')}`, svgLen: svg.length };
    }
    const expected = EXPECTED_ELEMENTS[type] ?? [];
    for (const re of expected) {
      if (!re.test(svg)) {
        return { id, name, type, status: 'WARN', reason: `핵심 요소 누락: ${re.source}`, svgLen: svg.length };
      }
    }
    // bbox 확인: viewBox="0 0 W H" 에서 W, H > 0
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    if (vb) {
      const w = parseFloat(vb[1]);
      const h = parseFloat(vb[2]);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w < 20 || h < 20) {
        return { id, name, type, status: 'WARN', reason: `bbox 비정상: ${w}x${h}` };
      }
    }
    return { id, name, type, status: 'OK', svgLen: svg.length };
  } catch (err) {
    return { id, name, type, status: 'FAIL', reason: `예외: ${(err as Error).message}` };
  }
}

// 1. curriculum 프리셋 (209개)
for (const p of ALL_PRESETS) {
  results.push(audit(p.id, p.name, p.diagramType, p.defaultParams));
}

// 2. SHAPE_PRESETS — DiagramSpec 기반 (별도 렌더러)
for (const p of SHAPE_PRESETS) {
  results.push(audit(p.id, p.name, p.spec.type, p.spec as unknown as Record<string, unknown>, 'spec'));
}

// 요약
const byStatus = {
  OK: results.filter(r => r.status === 'OK').length,
  WARN: results.filter(r => r.status === 'WARN').length,
  FAIL: results.filter(r => r.status === 'FAIL').length,
};
const byType: Record<string, { ok: number; warn: number; fail: number }> = {};
for (const r of results) {
  byType[r.type] ??= { ok: 0, warn: 0, fail: 0 };
  if (r.status === 'OK') byType[r.type].ok++;
  else if (r.status === 'WARN') byType[r.type].warn++;
  else byType[r.type].fail++;
}

console.log(`\n\x1b[36m프리셋 전수 감사 결과 — 총 ${results.length}개\x1b[0m`);
console.log(`  \x1b[32m✓ OK: ${byStatus.OK}\x1b[0m`);
console.log(`  \x1b[33m⚠ WARN: ${byStatus.WARN}\x1b[0m`);
console.log(`  \x1b[31m✗ FAIL: ${byStatus.FAIL}\x1b[0m`);
console.log('');

// 타입별 분포
console.log('\x1b[36m타입별 분포:\x1b[0m');
const typeEntries = Object.entries(byType).sort((a, b) => (b[1].fail + b[1].warn) - (a[1].fail + a[1].warn));
for (const [type, c] of typeEntries) {
  const total = c.ok + c.warn + c.fail;
  const status = c.fail > 0 ? '\x1b[31m✗\x1b[0m' : c.warn > 0 ? '\x1b[33m⚠\x1b[0m' : '\x1b[32m✓\x1b[0m';
  console.log(`  ${status} ${type.padEnd(22)} ok=${c.ok} warn=${c.warn} fail=${c.fail} (총 ${total})`);
}
console.log('');

// FAIL 목록
const failures = results.filter(r => r.status === 'FAIL');
if (failures.length > 0) {
  console.log('\x1b[31m=== FAIL 목록 ===\x1b[0m');
  for (const f of failures) {
    console.log(`  ${f.type.padEnd(20)} ${f.id}  "${f.name}"  → ${f.reason}`);
  }
  console.log('');
}

// WARN 목록
const warnings = results.filter(r => r.status === 'WARN');
if (warnings.length > 0) {
  console.log('\x1b[33m=== WARN 목록 ===\x1b[0m');
  for (const w of warnings) {
    console.log(`  ${w.type.padEnd(20)} ${w.id}  "${w.name}"  → ${w.reason}`);
  }
  console.log('');
}

process.exit(byStatus.FAIL > 0 ? 1 : 0);
