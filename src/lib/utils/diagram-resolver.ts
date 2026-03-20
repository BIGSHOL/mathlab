import type { DiagramSpec } from '@/types/diagram';
import type { DiagramParam } from '@/types/pdf-extract';

/** diagramSpec 필드의 실제 형태를 판별한 결과 */
export type DiagramData =
  | { kind: 'spec'; data: DiagramSpec }
  | { kind: 'params'; data: DiagramParam[] }
  | { kind: 'none' };

/** DB의 diagramSpec Json 필드 값을 판별하여 적절한 타입으로 반환 */
export function resolveDiagramSpec(raw: unknown): DiagramData {
  if (!raw) return { kind: 'none' };

  // 배열이면 DiagramParam[] (PDF 추출 경로)
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { kind: 'none' };
    return { kind: 'params', data: raw as DiagramParam[] };
  }

  // 객체이고 type 필드가 있으면 DiagramSpec (AI 생성 경로)
  if (typeof raw === 'object' && raw !== null && 'type' in raw) {
    return { kind: 'spec', data: raw as DiagramSpec };
  }

  return { kind: 'none' };
}
