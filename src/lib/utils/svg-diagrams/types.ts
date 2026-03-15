/** SVG 다이어그램 타입 정의 */

// 지원 타입
export type DiagramType =
  | 'number_line'
  | 'fraction_circle'
  | 'fraction_rect'
  | 'place_value'
  | 'dot_array'
  | 'flow_chart'
  | 'coordinate_plane'
  | 'circle'
  | 'triangle'
  | 'quadrilateral'
  | 'function_graph'
  | 'venn_diagram'
  | 'regular_polygon';

// --- 초등 ---

export interface NumberLineParams {
  min: number;
  max: number;
  step: number;
  marks?: { value: number; label?: string; color?: string }[];
  highlights?: { from: number; to: number; color?: string; label?: string }[];
  label?: string;
}

export interface FractionCircleParams {
  totalParts: number;      // N등분
  coloredParts: number;    // 색칠할 부분 수
  count?: number;          // 원 개수 (기본 1)
  color?: string;
  label?: string;
}

export interface FractionRectParams {
  rows: number;
  cols: number;
  coloredCells?: number[]; // 0-based index
  coloredCount?: number;   // coloredCells 대신 앞에서부터 N개 색칠
  count?: number;          // 사각형 개수 (기본 1)
  color?: string;
  hatching?: boolean;      // 빗금 패턴 사용 여부
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

export interface CircleParams {
  cx?: number;
  cy?: number;
  radius?: number;
  labels?: { text: string; angle: number }[];
  arcs?: { startAngle: number; endAngle: number; label?: string }[];
}

export interface TriangleParams {
  vertices: [Point2D, Point2D, Point2D];
  sides?: { from: number; to: number; label: string }[];
  angles?: { vertex: number; value: string }[];
}

export interface QuadrilateralParams {
  vertices: [Point2D, Point2D, Point2D, Point2D];
  sides?: { from: number; to: number; label: string }[];
  angles?: { vertex: number; value: string }[];
  type?: 'rectangle' | 'square' | 'parallelogram' | 'trapezoid' | 'rhombus';
}

export interface FunctionDef {
  expression: string;
  color?: string;
  label?: string;
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
}

export interface VennDiagramParams {
  sets: VennSet[];
  intersection?: { elements?: string[] };
  universal?: { elements?: string[] };
}

export interface RegularPolygonParams {
  sides: number;
  labels?: { vertex: number; text: string }[];
  diagonals?: boolean;
  sideLength?: string;
}

// 통합 파라미터 유니온
export type DiagramParams =
  | NumberLineParams
  | FractionCircleParams
  | FractionRectParams
  | PlaceValueParams
  | DotArrayParams
  | FlowChartParams
  | CoordinatePlaneParams
  | CircleParams
  | TriangleParams
  | QuadrilateralParams
  | FunctionGraphParams
  | VennDiagramParams
  | RegularPolygonParams;
