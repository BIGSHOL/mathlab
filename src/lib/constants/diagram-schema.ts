/**
 * Gemini API용 diagramParams 공유 스키마
 *
 * pdf-extract/route.ts와 mathgen.ts에서 공통 사용.
 * 26개 DiagramParam 타입의 플랫 필드를 Gemini 구조화 출력 스키마로 정의.
 */
import { Type } from '@google/genai';

/** diagramParams 배열 항목 스키마 (Gemini responseSchema용) */
export const DIAGRAM_PARAM_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    diagramType: {
      type: Type.STRING,
      description: '26개 타입: fraction_circle | fraction_rect | number_line | place_value | dot_array | flow_chart | bar_chart | line_graph | picture_graph | pie_chart | band_chart | angle_figure | clock_face | coordinate_plane | circle | triangle | quadrilateral | function_graph | venn_diagram | regular_polygon | histogram | stem_leaf | solid_figure | net_diagram | tree_diagram | scatter_plot',
    },
    label: { type: Type.STRING, description: '도형 설명' },
    // ── 초등 기본 ──
    totalParts: { type: Type.NUMBER, description: 'fraction_circle: 등분 수' },
    coloredParts: { type: Type.NUMBER, description: 'fraction_circle: 색칠 조각 수' },
    count: { type: Type.NUMBER, description: '도형 개수 (fraction_circle/rect)' },
    rows: { type: Type.NUMBER, description: '행 수 (fraction_rect, dot_array)' },
    cols: { type: Type.NUMBER, description: '열 수 (fraction_rect, dot_array)' },
    coloredCount: { type: Type.NUMBER, description: 'fraction_rect: 색칠 칸 수' },
    hatching: { type: Type.BOOLEAN, description: '빗금 패턴' },
    min: { type: Type.NUMBER, description: 'number_line: 최솟값' },
    max: { type: Type.NUMBER, description: 'number_line: 최댓값' },
    step: { type: Type.NUMBER, description: '눈금/격자 간격' },
    hundreds: { type: Type.NUMBER, description: 'place_value: 백 자리' },
    tens: { type: Type.NUMBER, description: 'place_value: 십 자리' },
    ones: { type: Type.NUMBER, description: 'place_value: 일 자리' },
    // ── 초등 차트/그래프 ──
    categories: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'bar_chart/line_graph: 항목명 배열' },
    dataValues: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'bar_chart/line_graph: 데이터값 배열' },
    segments: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, value: { type: Type.NUMBER } }, required: ['label', 'value'] },
      description: 'pie_chart/band_chart: 부분 [{label,value}]',
    },
    title: { type: Type.STRING, description: '차트 제목' },
    xLabel: { type: Type.STRING, description: '차트 x축 라벨' },
    yLabel: { type: Type.STRING, description: '차트 y축 라벨' },
    horizontal: { type: Type.BOOLEAN, description: 'bar_chart: 가로 막대 여부' },
    // ── 초등 기타 ──
    angle: { type: Type.NUMBER, description: 'angle_figure: 각도(도)' },
    ray1Angle: { type: Type.NUMBER, description: 'angle_figure: 시작선 각도' },
    showProtractor: { type: Type.BOOLEAN, description: 'angle_figure: 각도기 표시' },
    hour: { type: Type.NUMBER, description: 'clock_face: 시 (1~12)' },
    minute: { type: Type.NUMBER, description: 'clock_face: 분 (0~59)' },
    nodes: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, text: { type: Type.STRING } }, required: ['id', 'text'] },
      description: 'flow_chart: 노드 [{id,text}]',
    },
    arrows: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { from: { type: Type.STRING }, to: { type: Type.STRING }, label: { type: Type.STRING } }, required: ['from', 'to'] },
      description: 'flow_chart: 화살표 [{from,to,label?}]',
    },
    // ── 중등 기하 ──
    vertices: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, label: { type: Type.STRING } }, required: ['x', 'y'] },
      description: 'triangle(3개)/quadrilateral(4개): 꼭짓점 [{x,y,label}]',
    },
    sideLabels: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { from: { type: Type.NUMBER }, to: { type: Type.NUMBER }, label: { type: Type.STRING } }, required: ['from', 'to', 'label'] },
      description: 'triangle/quadrilateral: 변 라벨 [{from,to,label}]',
    },
    angleLabels: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { vertex: { type: Type.NUMBER }, value: { type: Type.STRING } }, required: ['vertex', 'value'] },
      description: 'triangle/quadrilateral: 각 라벨 [{vertex,value}]',
    },
    nSides: { type: Type.NUMBER, description: 'regular_polygon: 변의 수' },
    diagonals: { type: Type.BOOLEAN, description: 'regular_polygon: 대각선 표시' },
    cx: { type: Type.NUMBER, description: 'circle: 중심 x' },
    cy: { type: Type.NUMBER, description: 'circle: 중심 y' },
    radius: { type: Type.NUMBER, description: 'circle: 반지름' },
    circleLabels: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, angle: { type: Type.NUMBER }, position: { type: Type.STRING } }, required: ['text', 'angle'] },
      description: 'circle: 라벨 [{text,angle,position?}]',
    },
    arcs: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { startAngle: { type: Type.NUMBER }, endAngle: { type: Type.NUMBER }, label: { type: Type.STRING } }, required: ['startAngle', 'endAngle'] },
      description: 'circle: 호 [{startAngle,endAngle,label?}]',
    },
    // ── 좌표/함수 ──
    xRange: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'coordinate_plane/function_graph: x축 범위 [min,max]' },
    yRange: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'coordinate_plane/function_graph: y축 범위 [min,max]' },
    points: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, label: { type: Type.STRING } }, required: ['x', 'y'] },
      description: 'coordinate_plane/function_graph/scatter_plot: 점 [{x,y,label?}]',
    },
    functions: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { expression: { type: Type.STRING }, label: { type: Type.STRING } }, required: ['expression'] },
      description: 'function_graph: 함수식 [{expression,label?}]. JS math 문법: +,-,*,/,^ (예: "-3*(x-1)^2+3")',
    },
    hideTickLabels: {
      type: Type.BOOLEAN,
      description: 'coordinate_plane/function_graph: true면 축 눈금 숫자 숨김 (개념적 스케치용). 원본 이미지에 좌표값이 없는 스케치면 true.',
      nullable: true,
    },
    // ── 중등 통계 ──
    bins: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { rangeStart: { type: Type.NUMBER }, rangeEnd: { type: Type.NUMBER }, frequency: { type: Type.NUMBER } }, required: ['rangeStart', 'rangeEnd', 'frequency'] },
      description: 'histogram: 계급 [{rangeStart,rangeEnd,frequency}]',
    },
    stems: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { stem: { type: Type.NUMBER }, leaves: { type: Type.ARRAY, items: { type: Type.NUMBER } } }, required: ['stem', 'leaves'] },
      description: 'stem_leaf: 줄기와 잎 [{stem,leaves}]',
    },
    showFrequencyPolygon: { type: Type.BOOLEAN, description: 'histogram: 도수분포다각형' },
    showTrendLine: { type: Type.BOOLEAN, description: 'scatter_plot: 추세선' },
    // ── 중등 기타 ──
    shape: { type: Type.STRING, description: 'solid_figure/net_diagram: cube|rectangular_prism|cylinder|cone|triangular_prism|pyramid|sphere' },
    dimensions: {
      type: Type.OBJECT,
      properties: { width: { type: Type.NUMBER }, height: { type: Type.NUMBER }, depth: { type: Type.NUMBER }, radius: { type: Type.NUMBER } },
      description: 'solid_figure: 치수',
    },
    sets: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, elements: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['label'] },
      description: 'venn_diagram: 집합 [{label,elements?}]',
    },
    intersectionElements: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'venn_diagram: 교집합 원소' },
    universalElements: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'venn_diagram: 전체집합 원소' },
    root: {
      type: Type.OBJECT,
      properties: { label: { type: Type.STRING }, children: { type: Type.ARRAY, items: { type: Type.STRING } } },
      description: 'tree_diagram: 루트 {label,children}',
    },
    quadType: { type: Type.STRING, description: 'quadrilateral: rectangle|square|parallelogram|trapezoid|rhombus' },
  },
  required: ['diagramType', 'label'],
} as const;

/** diagramParams 배열 스키마 (Gemini responseSchema용) */
export const DIAGRAM_PARAMS_SCHEMA = {
  type: Type.ARRAY,
  items: DIAGRAM_PARAM_ITEM_SCHEMA,
  description: '구조화된 다이어그램 (26개 타입). 서버가 SVG로 렌더링.',
} as const;
