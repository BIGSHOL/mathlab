/** 기본 좌표 타입 */
export type Point = [number, number];

/** 라벨 정보 */
export interface DiagramLabel {
  text: string;
  position: Point;
  fontSize?: number;
}

/** 선분 길이 표시 */
export interface EdgeLength {
  /** 두 꼭짓점의 인덱스 [from, to] */
  edge: [number, number];
  value: string;
}

// ─── 도형 유형 ────────────────────────────────────────

export interface TriangleDiagram {
  type: 'triangle';
  vertices: [Point, Point, Point];
  labels?: DiagramLabel[];
  /** 각도를 표시할 꼭짓점 인덱스 */
  showAngles?: number[];
  /** 각도 값 (인덱스 순서대로) */
  angleValues?: string[];
  showLengths?: EdgeLength[];
  /** 직각 표시할 꼭짓점 인덱스 */
  rightAngle?: number;
}

export interface CircleDiagram {
  type: 'circle';
  center: Point;
  radius: number;
  showRadius?: boolean;
  showDiameter?: boolean;
  /** 현(chord): 원 위 두 점의 각도(degree) */
  chords?: { from: number; to: number; label?: string }[];
  /** 접선: 접점의 각도(degree) */
  tangentLines?: { angle: number; label?: string }[];
  /** 호: 시작/끝 각도(degree) */
  arcs?: { from: number; to: number; label?: string }[];
  labels?: DiagramLabel[];
}

export interface CoordinatePlaneDiagram {
  type: 'coordinatePlane';
  xRange: [number, number];
  yRange: [number, number];
  showGrid?: boolean;
  /** 함수 그래프 */
  functions?: {
    expr: string;
    color?: string;
    domain?: [number, number];
    label?: string;
  }[];
  /** 점 표시 */
  points?: { coord: Point; label?: string; color?: string }[];
  /** 직선/선분 */
  lines?: { from: Point; to: Point; dashed?: boolean; label?: string }[];
  /** 영역 색칠 */
  regions?: { points: Point[]; color?: string; opacity?: number }[];
  labels?: DiagramLabel[];
}

export interface QuadrilateralDiagram {
  type: 'quadrilateral';
  vertices: [Point, Point, Point, Point];
  labels?: DiagramLabel[];
  showAngles?: number[];
  angleValues?: string[];
  showLengths?: EdgeLength[];
  /** 대각선 표시 */
  diagonals?: boolean;
}

export interface SolidFigureDiagram {
  type: 'solid';
  shape: 'cube' | 'cylinder' | 'cone' | 'sphere' | 'prism' | 'pyramid';
  dimensions: Record<string, number>;
  labels?: DiagramLabel[];
  showDimensions?: boolean;
}

export interface CompositeDiagram {
  type: 'composite';
  elements: DiagramSpec[];
  /** 전체 viewBox 오프셋 */
  offset?: Point;
}

/** 지원하는 모든 도형 유형의 유니온 */
export type DiagramSpec =
  | TriangleDiagram
  | CircleDiagram
  | CoordinatePlaneDiagram
  | QuadrilateralDiagram
  | SolidFigureDiagram
  | CompositeDiagram;
