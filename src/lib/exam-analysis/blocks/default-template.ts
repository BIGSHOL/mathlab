/**
 * 기본 총평 템플릿 — 순수 데이터(문자열 id만) 라 서버·클라이언트 공용.
 *
 * 이 순서/variant 조합은 **모듈화 이전의 V3 렌더 순서를 그대로 재현**한다.
 * 즉 아무것도 고르지 않은 기존 분석본은 지금까지와 똑같이 보여야 한다(회귀 방지 기준).
 */

import type { CommentaryTemplateConfig } from './types';
import { DEFAULT_THEME_ID } from '../commentary-themes';
import { DEFAULT_LAYOUT_ID } from '../commentary-layouts';
import { DEFAULT_COPY_ID } from '../commentary-copy';

export const DEFAULT_TEMPLATE: CommentaryTemplateConfig = {
  themeId: DEFAULT_THEME_ID,
  layoutId: DEFAULT_LAYOUT_ID,
  copyId: DEFAULT_COPY_ID,
  blocks: [
    { id: 'header', variant: 'editorial', enabled: true },
    { id: 'kpi', variant: 'dark', enabled: true },
    { id: 'feature', variant: 'split', enabled: true },
    { id: 'infographic', variant: 'full', enabled: true },
    { id: 'difficultyTable', variant: 'table', enabled: true },
    { id: 'previousComparison', variant: 'callout', enabled: true },
    { id: 'qa', variant: 'interview', enabled: true },
    { id: 'mainAnalysis', variant: 'list', enabled: true },
    { id: 'keyQuestions', variant: 'list', enabled: true },
    { id: 'pullQuote', variant: 'rule', enabled: true },
    { id: 'charts', variant: 'grid', enabled: true },
    { id: 'finalStrategy', variant: 'list', enabled: true },
    { id: 'conclusion', variant: 'cream', enabled: true },
    { id: 'footer', variant: 'credits', enabled: true },
  ],
};

/** 저장된 설정(Json)을 안전하게 파싱 — 형식이 깨졌으면 기본 템플릿 */
export function parseTemplateConfig(raw: unknown): CommentaryTemplateConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_TEMPLATE;
  const obj = raw as { themeId?: unknown; layoutId?: unknown; copyId?: unknown; blocks?: unknown };
  const blocks = Array.isArray(obj.blocks)
    ? obj.blocks.filter(
        (b): b is { id: string; variant: string; enabled: boolean } =>
          !!b && typeof b === 'object' && typeof (b as { id?: unknown }).id === 'string',
      )
    : [];
  if (!blocks.length) return DEFAULT_TEMPLATE;
  return {
    themeId: typeof obj.themeId === 'string' ? obj.themeId : DEFAULT_THEME_ID,
    // layoutId 는 나중에 추가된 축 — 이전에 저장된 설정에는 없으므로 기본 골격으로 폴백
    layoutId: typeof obj.layoutId === 'string' ? obj.layoutId : DEFAULT_LAYOUT_ID,
    copyId: typeof obj.copyId === 'string' ? obj.copyId : DEFAULT_COPY_ID,
    blocks: blocks.map((b) => ({
      id: b.id as CommentaryTemplateConfig['blocks'][number]['id'],
      variant: typeof b.variant === 'string' ? b.variant : '',
      enabled: b.enabled !== false,
    })),
  };
}
