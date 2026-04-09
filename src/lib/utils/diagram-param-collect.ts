/**
 * Gemini가 반환한 플랫 diagramParams 응답을 { type, label, params } 형태로 정규화하는 공유 유틸.
 * pdf-extract/route.ts와 mathgen.ts에서 공통 사용.
 */
import type { DiagramParam } from '@/types/pdf-extract';

/** 26개 타입 전체 플랫 필드 목록 */
export const FLAT_KEYS = [
  'totalParts', 'coloredParts', 'count', 'rows', 'cols', 'coloredCount',
  'hatching', 'min', 'max', 'step', 'hundreds', 'tens', 'ones',
  'categories', 'dataValues', 'segments', 'title', 'xLabel', 'yLabel', 'horizontal',
  'angle', 'ray1Angle', 'showProtractor', 'hour', 'minute', 'nodes', 'arrows',
  'vertices', 'sideLabels', 'angleLabels', 'nSides', 'diagonals',
  'cx', 'cy', 'radius', 'circleLabels', 'arcs', 'quadType',
  'xRange', 'yRange', 'points', 'functions',
  'bins', 'stems', 'showFrequencyPolygon', 'showTrendLine',
  'shape', 'dimensions', 'sets', 'intersectionElements', 'universalElements', 'root',
] as const;

/** 플랫 필드를 params 객체로 병합 + 렌더러 호환 변환 */
export function collectParams(dp: Record<string, unknown>, dtype: string): Record<string, unknown> {
  const params: Record<string, unknown> = (dp.params as Record<string, unknown>) || {};
  for (const key of FLAT_KEYS) {
    const val = dp[key];
    if (val !== undefined && val !== null && val !== 0 && val !== '') {
      params[key] = val;
    }
  }
  // 렌더러 호환 변환
  if (dtype === 'histogram' && Array.isArray(params.bins)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params.bins = (params.bins as any[]).map((b: any) => ({
      range: [b.rangeStart ?? b.range?.[0] ?? 0, b.rangeEnd ?? b.range?.[1] ?? 0],
      frequency: b.frequency ?? 0,
    }));
  }
  if (params.dataValues && !params.values) { params.values = params.dataValues; delete params.dataValues; }
  if (params.sideLabels && !params.sides) { params.sides = params.sideLabels; delete params.sideLabels; }
  if (params.angleLabels && !params.angles) { params.angles = params.angleLabels; delete params.angleLabels; }
  if (dtype === 'regular_polygon' && params.nSides && !params.sides) { params.sides = params.nSides; delete params.nSides; }
  return params;
}

/** Gemini 플랫 응답 배열을 정규화된 DiagramParam[] 배열로 변환 */
export function normalizeDiagramParams(rawParams: Record<string, unknown>[]): DiagramParam[] {
  const result: DiagramParam[] = [];
  for (const dp of rawParams) {
    const dtype = (dp.diagramType || dp.type) as string;
    if (!dtype) continue;
    const params = collectParams(dp, dtype);
    result.push({ type: dtype, label: (dp.label as string) || dtype, params });
  }
  return result;
}
