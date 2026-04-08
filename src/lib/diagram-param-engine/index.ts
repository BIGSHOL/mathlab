import { DiagramParamEngine } from './engine';
import { ALL_PLUGINS } from './plugins';

export type { DiagramData, DiagramPlugin } from './types';
export { DiagramParamEngine } from './engine';
export { num, arr } from './helpers';

/** 26개 플러그인이 등록된 싱글톤 엔진 */
export const diagramEngine = new DiagramParamEngine().registerAll(ALL_PLUGINS);

/** 하위 호환 — 기존 renderDiagram 시그니처 유지 */
export function renderDiagram(data: { type: string; params: Record<string, unknown> }): string | null {
  return diagramEngine.render(data as Parameters<typeof diagramEngine.render>[0]);
}
