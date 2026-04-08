import type { DiagramType } from '@/lib/utils/svg-diagrams/types';

/** 다이어그램 렌더 요청 */
export interface DiagramData {
  type: DiagramType;
  params: Record<string, unknown>;
}

/** 다이어그램 플러그인 — normalize + render를 하나로 묶는 단위 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DiagramPlugin<TParams = any> {
  /** 26개 타입 중 하나 */
  readonly type: DiagramType;
  /** Gemini 불규칙 파라미터 → 정규 파라미터 */
  normalize(raw: Record<string, unknown>): TParams;
  /** 정규 파라미터 → SVG 문자열 */
  render(params: TParams): string;
}
