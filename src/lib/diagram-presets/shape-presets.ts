/**
 * DiagramSpec 기반 polygon/quadrilateral 프리셋
 *
 * 기존 diagram-presets (DiagramParam 시스템, 209개)과 별도로 관리되는
 * 신규 polygon/splitDiagonal/outlineCurve 사용 프리셋 라이브러리.
 *
 * 주 용도:
 * - 계단형, L자, T자, ㄷ자, 집 모양 등 복잡한 N각형
 * - 보조선 분할 문제 (사각형을 대각선으로 나누어 삼각형 2개)
 * - 교과서급 문제 도형
 */

import type { DiagramSpec } from '@/types/diagram';

export interface ShapePreset {
  id: string;
  /** 카테고리 그룹 라벨 */
  group: '계단형' | '보조선 분할' | '복합 다각형' | '기본 도형';
  /** 학년급 힌트 (검색·필터용) */
  gradeHint?: string;
  name: string;
  description?: string;
  spec: DiagramSpec;
}

export const SHAPE_PRESETS: ShapePreset[] = [
  // ─────────────────────────────────────
  // 보조선 분할 (직각삼각형 2개로)
  // ─────────────────────────────────────
  {
    id: 'split-quad-diagonal-2tri',
    group: '보조선 분할',
    gradeHint: '중1',
    name: '사각형 → 대각선으로 삼각형 2개',
    description: '교과서 0596(1) — 직각 2개 사각형을 대각선으로 나누어 넓이 구하기',
    spec: {
      type: 'quadrilateral',
      vertices: [[0, 30], [110, 0], [130, 100], [10, 120]],
      rightAngleMarks: [0, 2],
      splitDiagonal: {
        from: 0, to: 2,
        fillA: '#D6F0E0', fillB: '#FFEDD5',
        labelA: '①', labelB: '②',
        style: 'dashed',
      },
      showLengths: [
        { edge: [0, 1], value: '5' }, { edge: [1, 2], value: '4' },
        { edge: [2, 3], value: 'b' }, { edge: [3, 0], value: 'a' },
      ],
      outlineCurve: { inflate: 14 },
    },
  },
  {
    id: 'split-rect-to-2tri',
    group: '보조선 분할',
    gradeHint: '초5',
    name: '직사각형 대각선 분할',
    description: '직사각형을 한 대각선으로 나누면 직각삼각형 2개',
    spec: {
      type: 'quadrilateral',
      preset: 'rectangle',
      sides: { width: 6, height: 4 },
      rightAngleMarks: [0, 1, 2, 3],
      splitDiagonal: {
        from: 0, to: 2,
        fillA: '#DBEAFE', fillB: '#FCE7F3',
        labelA: '①', labelB: '②',
      },
    },
  },

  // ─────────────────────────────────────
  // 복합 다각형 (오각형 집 모양 등)
  // ─────────────────────────────────────
  {
    id: 'pentagon-house',
    group: '복합 다각형',
    gradeHint: '중1',
    name: '오각형 집 모양 — 직사각형+삼각형',
    description: '교과서 0596(2) — 상단 삼각형과 하단 직사각형의 넓이를 분리 계산',
    spec: {
      type: 'polygon',
      vertices: [[0, 200], [200, 200], [200, 80], [100, 0], [0, 80]],
      rightAngleMarks: [0, 1, 2, 3, 4],
      splitLines: [{ from: 2, to: 4, style: 'dashed' }],
      regions: [
        { vertexIndices: [0, 1, 2, 4], fill: '#E0E0F0', label: '②' },
        { vertexIndices: [4, 2, 3], fill: '#FFEDD5', label: '①' },
      ],
      showLengths: [
        { edge: [0, 1], value: 'a' }, { edge: [1, 2], value: 'b' }, { edge: [2, 3], value: '2' },
      ],
      outlineCurve: { inflate: 14 },
    },
  },
  {
    id: 'l-shape-6',
    group: '복합 다각형',
    gradeHint: '초5·중1',
    name: 'L자 6각형',
    description: '두 직사각형을 L자로 붙인 도형',
    spec: {
      type: 'polygon',
      vertices: [[0, 120], [200, 120], [200, 60], [80, 60], [80, 0], [0, 0]],
      rightAngleMarks: [0, 1, 2, 3, 4, 5],
      fill: '#DBEAFE',
      showLengths: [
        { edge: [5, 0], value: 'a' }, { edge: [0, 1], value: 'b' },
        { edge: [1, 2], value: 'c' }, { edge: [2, 3], value: 'd' },
        { edge: [3, 4], value: 'e' }, { edge: [4, 5], value: 'f' },
      ],
    },
  },
  {
    id: 't-shape-8',
    group: '복합 다각형',
    gradeHint: '초5·중1',
    name: 'T자 8각형',
    description: 'T자 모양을 2개 직사각형으로 분할',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 60], [200, 60], [200, 120], [120, 120],
        [120, 200], [80, 200], [80, 120], [0, 120],
      ],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7],
      splitLines: [{ from: 3, to: 6, style: 'dashed' }],
      regions: [
        { vertexIndices: [0, 1, 2, 3, 6, 7], fill: '#FCE7F3', label: '①' },
        { vertexIndices: [6, 3, 4, 5], fill: '#CFFAFE', label: '②' },
      ],
      showLengths: [
        { edge: [0, 1], value: 'a' }, { edge: [3, 4], value: 'b' },
      ],
    },
  },
  {
    id: 'u-shape-8',
    group: '복합 다각형',
    gradeHint: '초5·중1',
    name: 'ㄷ자 8각형 (ㄷ/U자)',
    description: '가운데가 파인 ㄷ자 모양 — 깊은 오목부',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 0], [200, 0], [200, 200], [140, 200],
        [140, 60], [60, 60], [60, 200], [0, 200],
      ],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7],
      fill: '#FEF3C7',
      showLengths: [
        { edge: [0, 1], value: 'a' }, { edge: [1, 2], value: 'b' },
        { edge: [4, 5], value: 'c' },
      ],
    },
  },

  // ─────────────────────────────────────
  // 계단형 (중요! 사용자 요청)
  // ─────────────────────────────────────
  {
    id: 'staircase-2',
    group: '계단형',
    gradeHint: '초3~5',
    name: '2단 계단',
    description: '정사각형 2개 계단 — 넓이/둘레 문제',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 120],
        [200, 120],
        [200, 60],
        [100, 60],
        [100, 0],
        [0, 0],
      ],
      rightAngleMarks: [0, 1, 2, 3, 4, 5],
      fill: '#A7F3D0',
      showLengths: [
        { edge: [5, 0], value: 'a' }, { edge: [0, 1], value: 'b' },
        { edge: [2, 3], value: 'c' },
      ],
    },
  },
  {
    id: 'staircase-3',
    group: '계단형',
    gradeHint: '초5·중1',
    name: '3단 계단',
    description: '정사각형 3개 계단 — 계단 모양 넓이/둘레',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 180],
        [240, 180],
        [240, 120],
        [160, 120],
        [160, 60],
        [80, 60],
        [80, 0],
        [0, 0],
      ],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7],
      fill: '#FDE68A',
      showLengths: [
        { edge: [7, 0], value: 'a' },
        { edge: [0, 1], value: 'b' },
      ],
    },
  },
  {
    id: 'staircase-4',
    group: '계단형',
    gradeHint: '중1',
    name: '4단 계단',
    description: '정사각형 4개 계단',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 240],
        [240, 240],
        [240, 180],
        [180, 180],
        [180, 120],
        [120, 120],
        [120, 60],
        [60, 60],
        [60, 0],
        [0, 0],
      ],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      fill: '#BFDBFE',
      showLengths: [
        { edge: [9, 0], value: '높이' },
        { edge: [0, 1], value: '밑변' },
      ],
    },
  },
  {
    id: 'staircase-5',
    group: '계단형',
    gradeHint: '중1',
    name: '5단 계단 (왼쪽으로 내려감)',
    description: '5단 계단 둘레 구하기 문제 등',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 250],
        [250, 250],
        [250, 200],
        [200, 200],
        [200, 150],
        [150, 150],
        [150, 100],
        [100, 100],
        [100, 50],
        [50, 50],
        [50, 0],
        [0, 0],
      ],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      fill: '#E9D5FF',
      showLengths: [
        { edge: [11, 0], value: '세로' },
        { edge: [0, 1], value: '가로' },
      ],
    },
  },

  // ─────────────────────────────────────
  // 기본 도형 (컬러 채움 샘플)
  // ─────────────────────────────────────
  {
    id: 'right-tri-filled',
    group: '기본 도형',
    gradeHint: '초4~중1',
    name: '직각삼각형 (채움)',
    description: '직각삼각형 a/b/c + 색 채움',
    spec: {
      type: 'triangle',
      preset: 'right',
      sides: { a: 4, b: 3, c: 5 },
      fill: '#FEF3C7',
    },
  },
  {
    id: 'rect-filled',
    group: '기본 도형',
    gradeHint: '초3~5',
    name: '직사각형 (채움)',
    description: '직사각형 + 단색 채움',
    spec: {
      type: 'quadrilateral',
      preset: 'rectangle',
      sides: { width: 6, height: 4 },
      rightAngleMarks: [0, 1, 2, 3],
      fill: '#DBEAFE',
      showLengths: [
        { edge: [0, 1], value: '가로' }, { edge: [1, 2], value: '세로' },
      ],
    },
  },
];

/** 그룹별 프리셋 반환 */
export function groupShapePresets(): Record<string, ShapePreset[]> {
  const groups: Record<string, ShapePreset[]> = {};
  for (const p of SHAPE_PRESETS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  }
  return groups;
}
