import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import type { DiagramData, DiagramPlugin } from './types';

/** 다이어그램 플러그인 레지스트리 + 렌더 파이프라인 */
export class DiagramParamEngine {
  private plugins = new Map<DiagramType, DiagramPlugin>();

  /** 플러그인 등록 */
  register(plugin: DiagramPlugin): this {
    this.plugins.set(plugin.type, plugin);
    return this;
  }

  /** 여러 플러그인 일괄 등록 */
  registerAll(plugins: DiagramPlugin[]): this {
    for (const p of plugins) this.register(p);
    return this;
  }

  /** normalize → render 파이프라인 */
  render(data: DiagramData): string | null {
    const plugin = this.plugins.get(data.type);
    if (!plugin) return null;
    try {
      const normalized = plugin.normalize(data.params || {});
      return plugin.render(normalized);
    } catch (e) {
      console.error(`[DiagramEngine] ${data.type} 렌더링 실패:`, e);
      return null;
    }
  }

  /** 특정 타입의 플러그인 조회 */
  getPlugin(type: DiagramType): DiagramPlugin | undefined {
    return this.plugins.get(type);
  }

  /** 등록된 모든 타입 */
  get types(): DiagramType[] {
    return Array.from(this.plugins.keys());
  }

  /** 등록된 플러그인 수 */
  get size(): number {
    return this.plugins.size;
  }
}
