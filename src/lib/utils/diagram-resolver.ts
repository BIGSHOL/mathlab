import type { DiagramSpec } from '@/types/diagram';
import type { DiagramParam } from '@/types/pdf-extract';
import { convertSpecToParams } from '@/lib/utils/spec-to-params';

/** diagramSpec 필드의 실제 형태를 판별한 결과 — 항상 DiagramParam[]로 통일 */
export type DiagramData =
  | { kind: 'params'; data: DiagramParam[] }
  | { kind: 'none' };

/** DB의 diagramSpec Json 필드 값을 판별하여 DiagramParam[]로 통일 반환 */
export function resolveDiagramSpec(raw: unknown): DiagramData {
  if (!raw) return { kind: 'none' };

  // 배열이면 DiagramParam[] (PDF 추출 / 신규 AI 생성)
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { kind: 'none' };
    return { kind: 'params', data: raw as DiagramParam[] };
  }

  // 객체이고 type 필드가 있으면 레거시 DiagramSpec → DiagramParam[]로 변환
  if (typeof raw === 'object' && raw !== null && 'type' in raw) {
    const converted = convertSpecToParams(raw as DiagramSpec);
    if (converted.length > 0) return { kind: 'params', data: converted };
  }

  return { kind: 'none' };
}
