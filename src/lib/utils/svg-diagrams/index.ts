/** SVG 다이어그램 생성 디스패처 — Gemini 파라미터 정규화 포함 */
import type { DiagramType } from './types';
import type {
  NumberLineParams, FractionCircleParams, FractionRectParams,
  PlaceValueParams, DotArrayParams, FlowChartParams,
  BarChartParams, LineGraphParams, PictureGraphParams,
  PieChartParams, BandChartParams, AngleFigureParams, ClockFaceParams,
  CoordinatePlaneParams, CircleParams, TriangleParams,
  QuadrilateralParams, FunctionGraphParams, VennDiagramParams,
  RegularPolygonParams,
  HistogramParams, StemLeafParams, SolidFigureParams,
  NetDiagramParams, TreeDiagramParams, ScatterPlotParams,
} from './types';

// 초등
import { renderNumberLine } from './elementary/number-line';
import { renderFractionCircle } from './elementary/fraction-circle';
import { renderFractionRect } from './elementary/fraction-rect';
import { renderPlaceValue } from './elementary/place-value';
import { renderDotArray } from './elementary/dot-array';
import { renderFlowChart } from './elementary/flow-chart';
import { renderBarChart } from './elementary/bar-chart';
import { renderLineGraph } from './elementary/line-graph';
import { renderPictureGraph } from './elementary/picture-graph';
import { renderPieChart } from './elementary/pie-chart';
import { renderBandChart } from './elementary/band-chart';
import { renderAngleFigure } from './elementary/angle-figure';
import { renderClockFace } from './elementary/clock-face';

// 중등
import { renderCoordinatePlane } from './middle/coordinate-plane';
import { renderCircle, renderTriangle, renderQuadrilateral, renderRegularPolygon } from './middle/shapes';
import { renderFunctionGraph } from './middle/function-graph';
import { renderVennDiagram } from './middle/venn-diagram';
import { renderHistogram } from './middle/histogram';
import { renderStemLeaf } from './middle/stem-leaf';
import { renderSolidFigure } from './middle/solid-figure';
import { renderNetDiagram } from './middle/net-diagram';
import { renderTreeDiagram } from './middle/tree-diagram';
import { renderScatterPlot } from './middle/scatter-plot';

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
    coloredSlices: arr(p.coloredSlices),
    hatchedSlices: arr(p.hatchedSlices),
    hatchedParts: num(p.hatchedParts ?? 0, 0),
    count: num(p.count ?? p.circles ?? p.copies ?? p.num, 1),
    color: p.color,
    hatching: !!p.hatching,
    label: p.label,
  };
}

function normalizeFractionRect(p: P): FractionRectParams {
  return {
    rows: num(p.rows ?? p.row ?? 1, 1),
    cols: num(p.cols ?? p.col ?? p.columns ?? p.denominator ?? p.parts, 1),
    coloredCells: arr(p.coloredCells ?? p.colored_cells),
    coloredCount: num(p.coloredCount ?? p.colored ?? p.numerator ?? p.filled ?? p.shaded, 0),
    hatchedCells: arr(p.hatchedCells ?? p.hatched_cells),
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
    jumpArrows: arr(p.jumpArrows),
    openEndpoints: arr(p.openEndpoints),
    closedEndpoints: arr(p.closedEndpoints),
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

function normalizeBarChart(p: P): BarChartParams {
  return {
    categories: arr(p.categories ?? p.labels ?? p.items),
    values: arr<number>(p.values ?? p.data ?? p.counts).map(Number),
    title: p.title,
    yLabel: p.yLabel ?? p.y_label,
    xLabel: p.xLabel ?? p.x_label,
    barColor: p.barColor ?? p.color,
    horizontal: !!p.horizontal,
    yMax: p.yMax != null ? num(p.yMax, 0) : undefined,
    yStep: p.yStep != null ? num(p.yStep, 0) : undefined,
  };
}

function normalizeLineGraph(p: P): LineGraphParams {
  // datasets 또는 단일 values
  let datasets = arr<P>(p.datasets);
  if (datasets.length === 0 && Array.isArray(p.values)) {
    datasets = [{ values: p.values, label: p.dataLabel, color: p.lineColor }];
  }
  return {
    categories: arr(p.categories ?? p.labels ?? p.items),
    datasets: datasets.map(ds => ({
      values: arr<number>(ds.values ?? ds.data).map(Number),
      label: ds.label,
      color: ds.color,
    })),
    title: p.title,
    yLabel: p.yLabel ?? p.y_label,
    xLabel: p.xLabel ?? p.x_label,
    yMax: p.yMax != null ? num(p.yMax, 0) : undefined,
    yStep: p.yStep != null ? num(p.yStep, 0) : undefined,
    showDots: p.showDots !== false,
  };
}

function normalizePictureGraph(p: P): PictureGraphParams {
  return {
    categories: arr(p.categories ?? p.labels ?? p.items),
    values: arr<number>(p.values ?? p.data ?? p.counts).map(Number),
    symbol: p.symbol ?? p.icon,
    symbolValue: num(p.symbolValue ?? p.symbol_value ?? p.unit, 1),
    title: p.title,
    color: p.color,
  };
}

function normalizePieChart(p: P): PieChartParams {
  return {
    segments: arr<P>(p.segments ?? p.slices ?? p.data).map(s => ({
      label: String(s.label ?? s.name ?? ''),
      value: num(s.value ?? s.count ?? s.amount, 0),
      color: s.color,
    })),
    title: p.title,
    showPercent: p.showPercent !== false,
    showValue: !!p.showValue,
  };
}

function normalizeBandChart(p: P): BandChartParams {
  return {
    segments: arr<P>(p.segments ?? p.parts ?? p.data).map(s => ({
      label: String(s.label ?? s.name ?? ''),
      value: num(s.value ?? s.count ?? s.amount, 0),
      color: s.color,
    })),
    title: p.title,
    showPercent: p.showPercent !== false,
    height: p.height != null ? num(p.height, 40) : undefined,
  };
}

function normalizeAngleFigure(p: P): AngleFigureParams {
  return {
    angle: num(p.angle ?? p.degrees ?? p.deg, 90),
    showProtractor: !!p.showProtractor,
    label: p.label,
    ray1Angle: num(p.ray1Angle ?? p.startAngle ?? 0, 0),
    color: p.color,
    additionalAngles: arr(p.additionalAngles),
    parallelLines: arr(p.parallelLines),
  };
}

function normalizeClockFace(p: P): ClockFaceParams {
  return {
    hour: num(p.hour ?? p.hours ?? p.h, 12),
    minute: num(p.minute ?? p.minutes ?? p.min ?? p.m, 0),
    showNumbers: p.showNumbers !== false,
    label: p.label,
  };
}

function normalizeHistogram(p: P): HistogramParams {
  return {
    bins: arr<P>(p.bins ?? p.classes ?? p.data).map(b => ({
      range: Array.isArray(b.range) ? [num(b.range[0], 0), num(b.range[1], 0)] as [number, number] : [0, 0],
      frequency: num(b.frequency ?? b.freq ?? b.count, 0),
    })),
    title: p.title,
    xLabel: p.xLabel ?? p.x_label,
    yLabel: p.yLabel ?? p.y_label,
    showFrequencyPolygon: !!p.showFrequencyPolygon,
    color: p.color,
  };
}

function normalizeStemLeaf(p: P): StemLeafParams {
  return {
    stems: arr<P>(p.stems ?? p.data).map(s => ({
      stem: num(s.stem, 0),
      leaves: arr<number>(s.leaves ?? s.leaf).map(Number).filter(n => !isNaN(n)),
    })),
    title: p.title,
    stemLabel: p.stemLabel ?? p.stem_label,
    leafLabel: p.leafLabel ?? p.leaf_label,
  };
}

function normalizeSolidFigure(p: P): SolidFigureParams {
  return {
    shape: p.shape ?? p.type ?? 'cube',
    labels: arr(p.labels),
    dimensions: p.dimensions ?? {},
    showHiddenEdges: p.showHiddenEdges !== false,
    color: p.color,
  };
}

function normalizeNetDiagram(p: P): NetDiagramParams {
  return {
    shape: p.shape ?? p.type ?? 'cube',
    labels: arr(p.labels),
    foldLines: p.foldLines !== false,
    color: p.color,
  };
}

function normalizeTreeDiagram(p: P): TreeDiagramParams {
  return {
    root: p.root ?? { label: p.label ?? '시작', children: arr(p.children) },
    title: p.title,
    orientation: p.orientation ?? 'horizontal',
  };
}

function normalizeScatterPlot(p: P): ScatterPlotParams {
  const xRange = Array.isArray(p.xRange) ? p.xRange : [0, 10];
  const yRange = Array.isArray(p.yRange) ? p.yRange : [0, 10];
  return {
    points: arr<P>(p.points ?? p.data).map(pt => ({
      x: num(pt.x, 0),
      y: num(pt.y, 0),
      label: pt.label,
    })),
    xRange: [num(xRange[0], 0), num(xRange[1], 10)],
    yRange: [num(yRange[0], 0), num(yRange[1], 10)],
    xLabel: p.xLabel ?? p.x_label,
    yLabel: p.yLabel ?? p.y_label,
    title: p.title,
    gridStep: num(p.gridStep ?? p.step, 1),
    showTrendLine: !!p.showTrendLine,
    trendLineColor: p.trendLineColor,
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
    vectors: arr(p.vectors),
  };
}

function normalizeTriangleParams(p: P): TriangleParams {
  const verts = arr<P>(p.vertices ?? []).map(v => ({ x: num(v.x, 0), y: num(v.y, 0), label: v.label }));
  const vertices: [{ x: number; y: number; label?: string }, { x: number; y: number; label?: string }, { x: number; y: number; label?: string }] =
    verts.length >= 3 ? [verts[0], verts[1], verts[2]] : [{ x: 0, y: 0, label: 'A' }, { x: 100, y: 0, label: 'B' }, { x: 50, y: 80, label: 'C' }];
  return {
    vertices,
    sides: arr(p.sides ?? p.sideLabels),
    angles: arr(p.angles ?? p.angleLabels),
    specialPoints: arr(p.specialPoints),
    auxiliaryLines: arr(p.auxiliaryLines),
    inscribedCircle: !!p.inscribedCircle,
    circumscribedCircle: !!p.circumscribedCircle,
    rightAngleMarks: arr(p.rightAngleMarks),
    congruenceMarks: arr(p.congruenceMarks),
    parallelMarks: arr(p.parallelMarks),
    fill: p.fill,
    fillOpacity: p.fillOpacity != null ? num(p.fillOpacity, 0.15) : undefined,
    hatching: !!p.hatching,
    strokeColor: p.strokeColor,
  };
}

function normalizeQuadrilateralParams(p: P): QuadrilateralParams {
  const verts = arr<P>(p.vertices ?? []).map(v => ({ x: num(v.x, 0), y: num(v.y, 0), label: v.label }));
  const vertices: [{ x: number; y: number; label?: string }, { x: number; y: number; label?: string }, { x: number; y: number; label?: string }, { x: number; y: number; label?: string }] =
    verts.length >= 4 ? [verts[0], verts[1], verts[2], verts[3]] : [{ x: 0, y: 0, label: 'A' }, { x: 100, y: 0, label: 'B' }, { x: 100, y: 80, label: 'C' }, { x: 0, y: 80, label: 'D' }];
  return {
    vertices,
    sides: arr(p.sides ?? p.sideLabels),
    angles: arr(p.angles ?? p.angleLabels),
    type: p.quadType ?? p.type,
    diagonals: arr(p.diagonals),
    rightAngleMarks: arr(p.rightAngleMarks),
    congruenceMarks: arr(p.congruenceMarks),
    parallelMarks: arr(p.parallelMarks),
    fill: p.fill,
    fillOpacity: p.fillOpacity != null ? num(p.fillOpacity, 0.15) : undefined,
    hatching: !!p.hatching,
    strokeColor: p.strokeColor,
  };
}

function normalizeCircleParams(p: P): CircleParams {
  return {
    cx: p.cx != null ? num(p.cx, 0) : undefined,
    cy: p.cy != null ? num(p.cy, 0) : undefined,
    radius: p.radius != null ? num(p.radius, 60) : undefined,
    labels: arr(p.labels ?? p.circleLabels),
    arcs: arr(p.arcs),
    chords: arr(p.chords ?? p.chordLines),
    tangentLines: arr(p.tangentLines),
    radiusLines: arr(p.radiusLines),
    centralAngles: arr(p.centralAngles),
    inscribedAngles: arr(p.inscribedAngles),
    fill: p.fill,
    fillOpacity: p.fillOpacity != null ? num(p.fillOpacity, 0.15) : undefined,
    hatching: !!p.hatching,
    strokeColor: p.strokeColor,
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
      case 'bar_chart':
        return renderBarChart(normalizeBarChart(p));
      case 'line_graph':
        return renderLineGraph(normalizeLineGraph(p));
      case 'picture_graph':
        return renderPictureGraph(normalizePictureGraph(p));
      case 'pie_chart':
        return renderPieChart(normalizePieChart(p));
      case 'band_chart':
        return renderBandChart(normalizeBandChart(p));
      case 'angle_figure':
        return renderAngleFigure(normalizeAngleFigure(p));
      case 'clock_face':
        return renderClockFace(normalizeClockFace(p));

      // 중등
      case 'coordinate_plane':
        return renderCoordinatePlane(normalizeCoordinatePlane(p));
      case 'circle':
        return renderCircle(normalizeCircleParams(p));
      case 'triangle':
        return renderTriangle(normalizeTriangleParams(p));
      case 'quadrilateral':
        return renderQuadrilateral(normalizeQuadrilateralParams(p));
      case 'function_graph':
        return renderFunctionGraph(p as unknown as FunctionGraphParams);
      case 'venn_diagram':
        return renderVennDiagram(p as unknown as VennDiagramParams);
      case 'regular_polygon':
        return renderRegularPolygon(p as unknown as RegularPolygonParams);
      case 'histogram':
        return renderHistogram(normalizeHistogram(p));
      case 'stem_leaf':
        return renderStemLeaf(normalizeStemLeaf(p));
      case 'solid_figure':
        return renderSolidFigure(normalizeSolidFigure(p));
      case 'net_diagram':
        return renderNetDiagram(normalizeNetDiagram(p));
      case 'tree_diagram':
        return renderTreeDiagram(normalizeTreeDiagram(p));
      case 'scatter_plot':
        return renderScatterPlot(normalizeScatterPlot(p));

      default:
        return null;
    }
  } catch (e) {
    console.error(`[SVG Diagram] ${data.type} 렌더링 실패:`, e);
    return null;
  }
}

export type { DiagramType, DiagramData as DiagramDataType };
