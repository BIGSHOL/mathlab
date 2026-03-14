/** SVG 다이어그램 생성 디스패처 */
import { DiagramType } from './types';
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

/**
 * 다이어그램 데이터로 SVG 문자열 생성
 * @returns SVG 문자열 또는 null (알 수 없는 타입)
 */
export function renderDiagram(data: DiagramData): string | null {
  try {
    switch (data.type) {
      // 초등
      case 'number_line':
        return renderNumberLine(data.params as unknown as NumberLineParams);
      case 'fraction_circle':
        return renderFractionCircle(data.params as unknown as FractionCircleParams);
      case 'fraction_rect':
        return renderFractionRect(data.params as unknown as FractionRectParams);
      case 'place_value':
        return renderPlaceValue(data.params as unknown as PlaceValueParams);
      case 'dot_array':
        return renderDotArray(data.params as unknown as DotArrayParams);
      case 'flow_chart':
        return renderFlowChart(data.params as unknown as FlowChartParams);

      // 중등
      case 'coordinate_plane':
        return renderCoordinatePlane(data.params as unknown as CoordinatePlaneParams);
      case 'circle':
        return renderCircle(data.params as unknown as CircleParams);
      case 'triangle':
        return renderTriangle(data.params as unknown as TriangleParams);
      case 'quadrilateral':
        return renderQuadrilateral(data.params as unknown as QuadrilateralParams);
      case 'function_graph':
        return renderFunctionGraph(data.params as unknown as FunctionGraphParams);
      case 'venn_diagram':
        return renderVennDiagram(data.params as unknown as VennDiagramParams);
      case 'regular_polygon':
        return renderRegularPolygon(data.params as unknown as RegularPolygonParams);

      default:
        return null;
    }
  } catch (e) {
    console.error(`[SVG Diagram] ${data.type} 렌더링 실패:`, e);
    return null;
  }
}

export type { DiagramType, DiagramData as DiagramDataType };
