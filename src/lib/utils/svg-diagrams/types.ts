/** SVG 다이어그램 타입 정의 */

// 지원 타입
export type DiagramType =
  | 'number_line'
  | 'fraction_circle'
  | 'fraction_rect'
  | 'place_value'
  | 'dot_array'
  | 'flow_chart'
  | 'bar_chart'
  | 'line_graph'
  | 'picture_graph'
  | 'pie_chart'
  | 'band_chart'
  | 'angle_figure'
  | 'clock_face'
  | 'coordinate_plane'
  | 'circle'
  | 'triangle'
  | 'quadrilateral'
  | 'function_graph'
  | 'venn_diagram'
  | 'regular_polygon'
  | 'histogram'
  | 'stem_leaf'
  | 'solid_figure'
  | 'net_diagram'
  | 'tree_diagram'
  | 'scatter_plot';

// --- 초등 ---

export interface NumberLineParams {
  min: number;
  max: number;
  step: number;
  marks?: { value: number; label?: string; color?: string; showDot?: boolean }[];
  highlights?: { from: number; to: number; color?: string; label?: string; dashed?: boolean }[];
  label?: string;
  showAllTickLabels?: boolean; // true면 모든 눈금에 숫자 표시 (기본: min/max만)
}

export interface FractionCircleParams {
  totalParts: number;      // N등분
  coloredParts: number;    // 색칠할 부분 수 (앞에서부터, coloredSlices 없을 때)
  coloredSlices?: number[];  // 개별 조각 색칠 (글로벌 인덱스: circleIdx * totalParts + sliceIdx)
  hatchedParts?: number;   // 빗금 처리할 파이 조각 수 (앞에서부터)
  hatchedSlices?: number[];  // 개별 조각 빗금 (글로벌 인덱스)
  count?: number;          // 원 개수 (기본 1)
  color?: string;
  hatching?: boolean;      // 전체 색칠 파이에 빗금
  label?: string;
}

export interface FractionRectParams {
  rows: number;
  cols: number;
  coloredCells?: number[]; // 0-based index
  coloredCount?: number;   // coloredCells 대신 앞에서부터 N개 색칠
  hatchedCells?: number[]; // 빗금 처리할 셀 (0-based index, coloredCells와 독립)
  count?: number;          // 사각형 개수 (기본 1)
  color?: string;
  hatching?: boolean;      // 전체 색칠 셀 빗금 (hatchedCells가 없을 때)
  label?: string;
}

export interface PlaceValueParams {
  hundreds: number;
  tens: number;
  ones: number;
}

export interface DotArrayParams {
  rows: number;
  cols: number;
  symbol?: string; // default '●'
  label?: string;
}

export interface FlowChartNode {
  id: string;
  text: string;
  x?: number;
  y?: number;
}

export interface FlowChartArrow {
  from: string;
  to: string;
  label?: string;
}

export interface FlowChartParams {
  nodes: FlowChartNode[];
  arrows?: FlowChartArrow[];
}

// --- 중등 ---

export interface Point2D {
  x: number;
  y: number;
  label?: string;
}

export interface Line2D {
  points: Point2D[];
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
}

export interface CoordinatePlaneParams {
  xRange: [number, number];
  yRange: [number, number];
  gridStep?: number;
  points?: Point2D[];
  lines?: Line2D[];
}

/** 도형 공통 스타일 옵션 */
export interface ShapeStyle {
  fill?: string;           // 면 색상 (없으면 기본 연한 파랑)
  fillOpacity?: number;    // 면 투명도 (0~1, 기본 0.15)
  hatching?: boolean;      // 면 빗금 패턴
  strokeColor?: string;    // 선 색상 (없으면 기본 파랑)
}

export interface CircleParams extends ShapeStyle {
  cx?: number;
  cy?: number;
  radius?: number;
  labels?: { text: string; angle: number; position?: 'outside' | 'center' }[];
  arcs?: { startAngle: number; endAngle: number; label?: string; color?: string; strokeWidth?: number }[];
}

export interface TriangleParams extends ShapeStyle {
  vertices: [Point2D, Point2D, Point2D];
  sides?: { from: number; to: number; label: string }[];
  angles?: { vertex: number; value: string }[];
}

export interface QuadrilateralParams extends ShapeStyle {
  vertices: [Point2D, Point2D, Point2D, Point2D];
  sides?: { from: number; to: number; label: string }[];
  angles?: { vertex: number; value: string }[];
  type?: 'rectangle' | 'square' | 'parallelogram' | 'trapezoid' | 'rhombus';
}

export interface FunctionDef {
  expression: string;
  color?: string;
  label?: string;
  dashed?: boolean;
}

export interface FunctionGraphParams {
  xRange: [number, number];
  yRange: [number, number];
  gridStep?: number;
  functions: FunctionDef[];
  points?: Point2D[];
}

export interface VennSet {
  label: string;
  elements?: string[];
  color?: string;
}

export interface VennDiagramParams {
  sets: VennSet[];              // 최대 3개
  intersection?: { elements?: string[] };         // 전체 교집합 (A∩B 또는 A∩B∩C)
  intersectionAB?: { elements?: string[] };       // A∩B (3집합일 때)
  intersectionBC?: { elements?: string[] };       // B∩C (3집합일 때)
  intersectionAC?: { elements?: string[] };       // A∩C (3집합일 때)
  universal?: { elements?: string[] };
  hatching?: 'intersection' | 'none';             // 교집합 영역 빗금
}

export interface RegularPolygonParams extends ShapeStyle {
  sides: number;
  labels?: { vertex: number; text: string }[];
  diagonals?: boolean | { from: number; to: number; style?: 'solid' | 'dashed' }[];
  sideLength?: string;
}

// --- 초등 추가 ---

export interface BarChartParams {
  categories: string[];
  values: number[];
  title?: string;
  yLabel?: string;
  xLabel?: string;
  barColor?: string;
  horizontal?: boolean;
  yMax?: number;
  yStep?: number;
}

export interface LineGraphDataset {
  values: number[];
  label?: string;
  color?: string;
}

export interface LineGraphParams {
  categories: string[];
  datasets: LineGraphDataset[];
  title?: string;
  yLabel?: string;
  xLabel?: string;
  yMax?: number;
  yStep?: number;
  showDots?: boolean;
}

export interface PictureGraphParams {
  categories: string[];
  values: number[];
  symbol?: string;
  symbolValue?: number;
  title?: string;
  color?: string;
}

export interface PieChartSegment {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartParams {
  segments: PieChartSegment[];
  title?: string;
  showPercent?: boolean;
  showValue?: boolean;
}

export interface BandChartSegment {
  label: string;
  value: number;
  color?: string;
}

export interface BandChartParams {
  segments: BandChartSegment[];
  title?: string;
  showPercent?: boolean;
  height?: number;
}

export interface AngleFigureParams {
  angle: number;
  showProtractor?: boolean;
  label?: string;
  ray1Angle?: number;
  color?: string;
}

export interface ClockFaceParams {
  hour: number;
  minute: number;
  showNumbers?: boolean;
  label?: string;
}

// --- 중등 추가 ---

export interface HistogramBin {
  range: [number, number];
  frequency: number;
}

export interface HistogramParams {
  bins: HistogramBin[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  showFrequencyPolygon?: boolean;
  color?: string;
}

export interface StemLeafRow {
  stem: number;
  leaves: number[];
}

export interface StemLeafParams {
  stems: StemLeafRow[];
  title?: string;
  stemLabel?: string;
  leafLabel?: string;
}

export interface SolidFigureParams {
  shape: 'cube' | 'rectangular_prism' | 'cylinder' | 'cone' | 'triangular_prism' | 'pyramid' | 'sphere';
  labels?: { position: string; text: string }[];
  dimensions?: { width?: number; height?: number; depth?: number; radius?: number };
  showHiddenEdges?: boolean;
  color?: string;
}

export interface NetDiagramParams {
  shape: 'cube' | 'rectangular_prism' | 'cylinder' | 'cone' | 'triangular_prism' | 'pyramid';
  labels?: { face: number; text: string }[];
  foldLines?: boolean;
  color?: string;
}

export interface TreeNode {
  label: string;
  children?: TreeNode[];
  probability?: string;
}

export interface TreeDiagramParams {
  root: TreeNode;
  title?: string;
  orientation?: 'horizontal' | 'vertical';
}

export interface ScatterPlotParams {
  points: { x: number; y: number; label?: string }[];
  xRange: [number, number];
  yRange: [number, number];
  xLabel?: string;
  yLabel?: string;
  title?: string;
  gridStep?: number;
  showTrendLine?: boolean;
  trendLineColor?: string;
}

// 통합 파라미터 유니온
export type DiagramParams =
  | NumberLineParams
  | FractionCircleParams
  | FractionRectParams
  | PlaceValueParams
  | DotArrayParams
  | FlowChartParams
  | BarChartParams
  | LineGraphParams
  | PictureGraphParams
  | PieChartParams
  | BandChartParams
  | AngleFigureParams
  | ClockFaceParams
  | CoordinatePlaneParams
  | CircleParams
  | TriangleParams
  | QuadrilateralParams
  | FunctionGraphParams
  | VennDiagramParams
  | RegularPolygonParams
  | HistogramParams
  | StemLeafParams
  | SolidFigureParams
  | NetDiagramParams
  | TreeDiagramParams
  | ScatterPlotParams;
