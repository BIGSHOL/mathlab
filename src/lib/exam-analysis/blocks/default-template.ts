/**
 * 기본 총평 템플릿 — 순수 데이터(문자열 id만) 라 서버·클라이언트 공용.
 *
 * 이 순서/variant 조합은 **모듈화 이전의 V3 렌더 순서를 그대로 재현**한다.
 * 즉 아무것도 고르지 않은 기존 분석본은 지금까지와 똑같이 보여야 한다(회귀 방지 기준).
 */

import type { CommentaryTemplateConfig, TemplateBlockConfig } from './types';
import { isBlockId } from './types';
import { DEFAULT_THEME_ID, COMMENTARY_THEMES } from '../commentary-themes';
import { DEFAULT_LAYOUT_ID, COMMENTARY_LAYOUTS } from '../commentary-layouts';
import { DEFAULT_COPY_ID, COMMENTARY_COPIES } from '../commentary-copy';

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

/** 카탈로그에 실재하는 id 만 통과 — 없는 id 는 조용한 폴백이 아니라 명시 기본값으로 */
function pickId(raw: unknown, known: readonly { id: string }[], fallback: string): string {
  return typeof raw === 'string' && known.some((x) => x.id === raw) ? raw : fallback;
}

/**
 * 저장된 설정(Json)을 안전하게 파싱 — 형식이 깨졌으면 기본 템플릿.
 *
 * ⚠️ 블록 id 만 화이트리스트하면 부족하다. themeId·layoutId·copyId 도 카탈로그와 대조해야
 * 한다 — `typeof === 'string'` 만 보면 PUT 이 임의 문자열을 **영구 저장**하고, 렌더 시점에
 * `themeClassName()` 이 빈 문자열로 폴백해 "저장은 됐는데 아무 일도 안 일어나는" 상태가 된다.
 */
export function parseTemplateConfig(raw: unknown): CommentaryTemplateConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_TEMPLATE;
  const obj = raw as { themeId?: unknown; layoutId?: unknown; copyId?: unknown; blocks?: unknown };
  // 모르는 블록 id 는 여기서 버린다 — `as BlockId` 로 통과시키면 타입만 속이고
  // 실제 판별은 하류(normalizeTemplate)에 떠넘기는 꼴이 된다 (CLAUDE.md #11).
  const blocks: TemplateBlockConfig[] = Array.isArray(obj.blocks)
    ? obj.blocks.flatMap((b) => {
        if (!b || typeof b !== 'object' || Array.isArray(b)) return [];
        const rec = b as Record<string, unknown>;
        if (!isBlockId(rec.id)) return []; // 모르는 블록 id 는 버린다
        return [
          {
            id: rec.id, // isBlockId 가 BlockId 로 좁혀 준 값 — 캐스팅 없음
            variant: typeof rec.variant === 'string' ? rec.variant : '',
            enabled: rec.enabled !== false,
          },
        ];
      })
    : [];
  return {
    themeId: pickId(obj.themeId, COMMENTARY_THEMES, DEFAULT_THEME_ID),
    // layoutId 는 나중에 추가된 축 — 이전에 저장된 설정에는 없으므로 기본 골격으로 폴백
    layoutId: pickId(obj.layoutId, COMMENTARY_LAYOUTS, DEFAULT_LAYOUT_ID),
    copyId: pickId(obj.copyId, COMMENTARY_COPIES, DEFAULT_COPY_ID),
    // 블록이 통째로 깨졌으면 블록만 기본값으로 되돌린다.
    // 예전엔 여기서 DEFAULT_TEMPLATE 을 통째로 반환해 **사용자가 고른 테마·골격·문체까지 함께 버렸다**.
    blocks: blocks.length ? blocks : DEFAULT_TEMPLATE.blocks,
  };
}
