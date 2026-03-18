import type { DiagramType } from '@/lib/utils/svg-diagrams/types';

// ── 공통 타입 ──
export interface SubFormProps {
  params: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

export interface Point2DInput {
  x: number;
  y: number;
  label?: string;
}

// ── 타입 그룹 정의 ──
export const TYPE_GROUPS = [
  {
    label: '초등',
    types: [
      { value: 'fraction_rect' as DiagramType, label: '분수 사각형' },
      { value: 'fraction_circle' as DiagramType, label: '분수 원' },
      { value: 'number_line' as DiagramType, label: '수직선' },
      { value: 'place_value' as DiagramType, label: '자릿값' },
      { value: 'dot_array' as DiagramType, label: '점 배열' },
      { value: 'flow_chart' as DiagramType, label: '흐름도' },
      { value: 'bar_chart' as DiagramType, label: '막대그래프' },
      { value: 'line_graph' as DiagramType, label: '꺾은선그래프' },
      { value: 'picture_graph' as DiagramType, label: '그림그래프' },
      { value: 'pie_chart' as DiagramType, label: '원그래프' },
      { value: 'band_chart' as DiagramType, label: '띠그래프' },
      { value: 'angle_figure' as DiagramType, label: '각도' },
      { value: 'clock_face' as DiagramType, label: '시계' },
    ],
  },
  {
    label: '중등',
    types: [
      { value: 'coordinate_plane' as DiagramType, label: '좌표평면' },
      { value: 'triangle' as DiagramType, label: '삼각형' },
      { value: 'quadrilateral' as DiagramType, label: '사각형' },
      { value: 'circle' as DiagramType, label: '원' },
      { value: 'regular_polygon' as DiagramType, label: '정다각형' },
      { value: 'function_graph' as DiagramType, label: '함수 그래프' },
      { value: 'venn_diagram' as DiagramType, label: '벤 다이어그램' },
      { value: 'histogram' as DiagramType, label: '히스토그램' },
      { value: 'stem_leaf' as DiagramType, label: '줄기잎그림' },
      { value: 'solid_figure' as DiagramType, label: '입체도형' },
      { value: 'net_diagram' as DiagramType, label: '전개도' },
      { value: 'tree_diagram' as DiagramType, label: '수형도' },
      { value: 'scatter_plot' as DiagramType, label: '산점도' },
    ],
  },
];

// ── 색상 옵션 ──
export const COLOR_OPTIONS = [
  { value: '#3B82F6', label: '파랑' },
  { value: '#F97316', label: '주황' },
  { value: '#10B981', label: '초록' },
  { value: '#EF4444', label: '빨강' },
  { value: '#7C3AED', label: '보라' },
  { value: '#F59E0B', label: '노랑' },
];

export const LINE_COLOR_OPTIONS = [
  { value: '', label: '기본(검정)' },
  { value: '#3B82F6', label: '파랑' },
  { value: '#EF4444', label: '빨강' },
  { value: '#10B981', label: '초록' },
  { value: '#F97316', label: '주황' },
  { value: '#7C3AED', label: '보라' },
];

// ── 기본 파라미터 ──
export function getDefaultParams(type: DiagramType): Record<string, unknown> {
  switch (type) {
    case 'fraction_rect':
      return { rows: 3, cols: 1, coloredCount: 1, count: 1, hatching: false };
    case 'fraction_circle':
      return { totalParts: 4, coloredParts: 1, count: 1 };
    case 'number_line':
      return { min: 0, max: 1, step: 0.25 };
    case 'place_value':
      return { hundreds: 2, tens: 3, ones: 5 };
    case 'dot_array':
      return { rows: 3, cols: 4, symbol: '●' };
    case 'flow_chart':
      return { nodes: [{ id: 'n0', text: '시작' }, { id: 'n1', text: '끝' }], arrows: [{ from: 'n0', to: 'n1' }] };
    case 'coordinate_plane':
      return { xRange: [-5, 5], yRange: [-5, 5], gridStep: 1, points: [], lines: [] };
    case 'triangle':
      return { vertices: [{ x: 100, y: 10, label: 'A' }, { x: 10, y: 150, label: 'B' }, { x: 190, y: 150, label: 'C' }], sides: [], angles: [] };
    case 'quadrilateral':
      return { vertices: [{ x: 30, y: 10, label: 'A' }, { x: 170, y: 10, label: 'B' }, { x: 190, y: 130, label: 'C' }, { x: 10, y: 130, label: 'D' }], sides: [], angles: [], type: 'rectangle' };
    case 'circle':
      return { radius: 60, labels: [], arcs: [] };
    case 'function_graph':
      return { xRange: [-5, 5], yRange: [-5, 5], gridStep: 1, functions: [{ expression: 'x', label: 'y=x' }], points: [] };
    case 'venn_diagram':
      return { sets: [{ label: 'A', elements: [] }, { label: 'B', elements: [] }], intersection: { elements: [] } };
    case 'regular_polygon':
      return { sides: 5, diagonals: false, sideLength: '' };
    case 'bar_chart':
      return { categories: ['사과', '배', '감'], values: [5, 3, 7], title: '', yLabel: '', barColor: '#3B82F6', horizontal: false };
    case 'line_graph':
      return { categories: ['1월', '2월', '3월', '4월'], datasets: [{ values: [3, 5, 4, 7], label: '', color: '#3B82F6' }], title: '', yLabel: '', showDots: true };
    case 'picture_graph':
      return { categories: ['사과', '배', '감'], values: [3, 2, 5], symbol: '●', symbolValue: 1, title: '' };
    case 'pie_chart':
      return { segments: [{ label: '사과', value: 40 }, { label: '배', value: 30 }, { label: '감', value: 30 }], title: '', showPercent: true };
    case 'band_chart':
      return { segments: [{ label: '사과', value: 40 }, { label: '배', value: 35 }, { label: '감', value: 25 }], title: '', showPercent: true };
    case 'angle_figure':
      return { angle: 60, showProtractor: false, label: '', ray1Angle: 0, color: '#3B82F6' };
    case 'clock_face':
      return { hour: 3, minute: 0, showNumbers: true, label: '' };
    case 'histogram':
      return { bins: [{ range: [0, 10], frequency: 3 }, { range: [10, 20], frequency: 7 }, { range: [20, 30], frequency: 5 }, { range: [30, 40], frequency: 2 }], title: '', xLabel: '', yLabel: '도수', showFrequencyPolygon: false, color: '#3B82F6' };
    case 'stem_leaf':
      return { stems: [{ stem: 1, leaves: [2, 3, 5] }, { stem: 2, leaves: [0, 4, 7, 8] }, { stem: 3, leaves: [1, 6] }], title: '' };
    case 'solid_figure':
      return { shape: 'cube', labels: [], showHiddenEdges: true, color: '#3B82F6' };
    case 'net_diagram':
      return { shape: 'cube', labels: [], foldLines: true, color: '#3B82F6' };
    case 'tree_diagram':
      return { root: { label: '시작', children: [{ label: 'A', children: [{ label: 'a' }, { label: 'b' }] }, { label: 'B', children: [{ label: 'a' }, { label: 'b' }] }] }, title: '', orientation: 'horizontal' };
    case 'scatter_plot':
      return { points: [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 3 }, { x: 4, y: 6 }, { x: 5, y: 5 }], xRange: [0, 6], yRange: [0, 7], xLabel: '', yLabel: '', gridStep: 1, showTrendLine: false };
    default:
      return {};
  }
}
