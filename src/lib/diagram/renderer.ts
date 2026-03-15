import { DiagramSpec, Point } from '@/types/diagram';
import { computeViewBox } from './utils';
import { renderTriangle } from './shapes/triangle';
import { renderCircle } from './shapes/circle';
import { renderQuadrilateral } from './shapes/quadrilateral';
import { renderCoordinatePlane, coordinatePlaneViewBox } from './shapes/coordinate';
import { renderSolid, solidViewBox } from './shapes/solid';

/**
 * DiagramSpec → 완성된 SVG 문자열 변환
 * AI가 생성한 구조화된 도형 명세를 정확한 SVG로 렌더링
 */
export function renderDiagram(spec: DiagramSpec): string {
  const viewBox = getViewBox(spec);
  const content = renderShape(spec);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" style="max-width:100%;height:auto;">`,
    content,
    '</svg>',
  ].join('\n');
}

function renderShape(spec: DiagramSpec): string {
  switch (spec.type) {
    case 'triangle':
      return renderTriangle(spec);
    case 'circle':
      return renderCircle(spec);
    case 'quadrilateral':
      return renderQuadrilateral(spec);
    case 'coordinatePlane':
      return renderCoordinatePlane(spec);
    case 'solid':
      return renderSolid(spec);
    case 'composite':
      return spec.elements.map((el) => renderShape(el)).join('\n');
    default:
      return '';
  }
}

function getViewBox(spec: DiagramSpec): string {
  switch (spec.type) {
    case 'triangle':
      return computeViewBox(spec.vertices);
    case 'circle': {
      const { center, radius } = spec;
      const points: Point[] = [
        [center[0] - radius, center[1] - radius],
        [center[0] + radius, center[1] + radius],
      ];
      return computeViewBox(points, 50);
    }
    case 'quadrilateral':
      return computeViewBox(spec.vertices);
    case 'coordinatePlane':
      return coordinatePlaneViewBox(spec);
    case 'solid':
      return solidViewBox(spec);
    case 'composite': {
      // 모든 하위 요소의 포인트를 수집하여 전체 viewBox 계산
      const allPoints = collectPoints(spec);
      return allPoints.length > 0 ? computeViewBox(allPoints, 50) : '0 0 400 300';
    }
    default:
      return '0 0 400 300';
  }
}

function collectPoints(spec: DiagramSpec): Point[] {
  switch (spec.type) {
    case 'triangle':
      return [...spec.vertices];
    case 'circle':
      return [
        [spec.center[0] - spec.radius, spec.center[1] - spec.radius],
        [spec.center[0] + spec.radius, spec.center[1] + spec.radius],
      ];
    case 'quadrilateral':
      return [...spec.vertices];
    case 'coordinatePlane':
      return [
        [0, 0],
        [400, 360],
      ];
    case 'solid':
      return [
        [0, 0],
        [300, 280],
      ];
    case 'composite':
      return spec.elements.flatMap(collectPoints);
    default:
      return [];
  }
}
