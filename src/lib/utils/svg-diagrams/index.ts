/** SVG 다이어그램 생성 디스패처 — Gemini 파라미터 정규화 포함 */
import type { DiagramType } from './types';
import type {
  NumberLineParams, FractionCircleParams, FractionRectParams,
  PlaceValueParams, DotArrayParams, FlowChartParams,
  CoordinatePlaneParams, CircleParams, TriangleParams,
  QuadrilateralParams, FunctionGraphParams, VennDiagramParams,
  RegularPolygonParams,
} from './types';

// 초등
import { renderNumberLine } from './elementary/number-line';
import { renderFractionCircle } from './elementary/fraction-circle';
import { renderFractionRect } from './elementary/fraction-rect';
import { renderPlaceValue } from './elementary/place-value';
import { renderDotArray } from './elementary/dot-array';
import { renderFlowChart } from './elementary/flow-chart';

// 중등
import { renderCoordinatePlane } from './middle/coordinate-plane';
import { renderCircle, renderTriangle, renderQuadrilateral, renderRegularPolygon } from './middle/shapes';
import { renderFunctionGraph } from './middle/function-graph';
import { renderVennDiagram } from './middle/venn-diagram';

export interface DiagramData {
  type: DiagramType;
  params: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = Record<string, any>;

/** 숫자 추출 헬퍼 */
function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

/** 배열 추출 헬퍼 */
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}

/**
 * Gemini의 불규칙한 파라미터를 정규화
 * 여러 가지 가능한 필드명을 모두 처리
 */
function normalizeFractionCircle(p: P): FractionCircleParams {
  return {
    totalParts: num(p.totalParts ?? p.parts ?? p.denominator ?? p.divisions ?? p.segments, 1),
    coloredParts: num(p.coloredParts ?? p.colored ?? p.numerator ?? p.filled ?? p.shaded, 0),
    count: num(p.count ?? p.circles ?? p.copies ?? p.num, 1),
    color: p.color,
    label: p.label,
  };
}

function normalizeFractionRect(p: P): FractionRectParams {
  return {
    rows: num(p.rows ?? p.row ?? 1, 1),
    cols: num(p.cols ?? p.col ?? p.columns ?? p.denominator ?? p.parts, 1),
    coloredCells: arr(p.coloredCells ?? p.colored_cells),
    coloredCount: num(p.coloredCount ?? p.colored ?? p.numerator ?? p.filled ?? p.shaded, 0),
    count: num(p.count ?? p.rectangles ?? p.copies ?? p.num, 1),
    color: p.color,
    hatching: !!p.hatching,
    label: p.label,
  };
}

function normalizeNumberLine(p: P): NumberLineParams {
  const min = num(p.min ?? p.start ?? p.from, 0);
  const max = num(p.max ?? p.end ?? p.to, min + 1);
  const range = max - min;
  return {
    min,
    max,
    step: num(p.step ?? p.interval ?? p.tick, range > 0 ? range / Math.min(10, range) : 1),
    marks: arr(p.marks ?? p.points ?? p.markers),
    highlights: arr(p.highlights ?? p.arcs ?? p.jumps ?? p.regions),
    label: p.label,
  };
}

function normalizePlaceValue(p: P): PlaceValueParams {
  return {
    hundreds: num(p.hundreds ?? p.hundred ?? p.h, 0),
    tens: num(p.tens ?? p.ten ?? p.t, 0),
    ones: num(p.ones ?? p.one ?? p.o, 0),
  };
}

function normalizeDotArray(p: P): DotArrayParams {
  return {
    rows: num(p.rows ?? p.row, 1),
    cols: num(p.cols ?? p.col ?? p.columns, 1),
    symbol: p.symbol,
    label: p.label,
  };
}

function normalizeFlowChart(p: P): FlowChartParams {
  const nodes = arr<P>(p.nodes ?? p.steps);
  const normalized = nodes.map((n, i) => ({
    id: n.id ?? `node_${i}`,
    text: String(n.text ?? n.label ?? n.value ?? ''),
    x: n.x != null ? num(n.x, 0) : undefined,
    y: n.y != null ? num(n.y, i * 60) : undefined,
  }));
  return {
    nodes: normalized,
    arrows: arr(p.arrows ?? p.edges ?? p.connections),
  };
}

function normalizeCoordinatePlane(p: P): CoordinatePlaneParams {
  const xRange = Array.isArray(p.xRange) ? p.xRange : [-5, 5];
  const yRange = Array.isArray(p.yRange) ? p.yRange : [-5, 5];
  return {
    xRange: [num(xRange[0], -5), num(xRange[1], 5)],
    yRange: [num(yRange[0], -5), num(yRange[1], 5)],
    gridStep: num(p.gridStep ?? p.step, 1),
    points: arr(p.points),
    lines: arr(p.lines),
  };
}

/**
 * 다이어그램 데이터로 SVG 문자열 생성
 * @returns SVG 문자열 또는 null (알 수 없는 타입)
 */
export function renderDiagram(data: DiagramData): string | null {
  const p = data.params || {};

  try {
    switch (data.type) {
      // 초등
      case 'number_line':
        return renderNumberLine(normalizeNumberLine(p));
      case 'fraction_circle':
        return renderFractionCircle(normalizeFractionCircle(p));
      case 'fraction_rect':
        return renderFractionRect(normalizeFractionRect(p));
      case 'place_value':
        return renderPlaceValue(normalizePlaceValue(p));
      case 'dot_array':
        return renderDotArray(normalizeDotArray(p));
      case 'flow_chart':
        return renderFlowChart(normalizeFlowChart(p));

      // 중등
      case 'coordinate_plane':
        return renderCoordinatePlane(normalizeCoordinatePlane(p));
      case 'circle':
        return renderCircle(p as unknown as CircleParams);
      case 'triangle':
        return renderTriangle(p as unknown as TriangleParams);
      case 'quadrilateral':
        return renderQuadrilateral(p as unknown as QuadrilateralParams);
      case 'function_graph':
        return renderFunctionGraph(p as unknown as FunctionGraphParams);
      case 'venn_diagram':
        return renderVennDiagram(p as unknown as VennDiagramParams);
      case 'regular_polygon':
        return renderRegularPolygon(p as unknown as RegularPolygonParams);

      default:
        return null;
    }
  } catch (e) {
    console.error(`[SVG Diagram] ${data.type} 렌더링 실패:`, e);
    return null;
  }
}

export type { DiagramType, DiagramData as DiagramDataType };
