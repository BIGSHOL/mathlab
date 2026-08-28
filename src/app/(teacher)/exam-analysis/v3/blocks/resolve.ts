/**
 * 템플릿 설정 + 데이터 → 실제 렌더할 블록 목록.
 *
 * 섹션 번호(01, 02 …)는 여기서 **순서대로 자동 부여**된다.
 * 모듈화 이전에는 V3CommentaryView 가 `nextSec++` 로 손수 계산했는데,
 * 블록을 끄거나 순서를 바꾸면 번호가 어긋나던 구조였다. 이제 순서만 바꾸면 번호가 따라온다.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type {
  CommentaryTemplateConfig,
  ResolvedBlock,
  TemplateBlockConfig,
} from '@/lib/exam-analysis/blocks/types';
import { DEFAULT_TEMPLATE } from '@/lib/exam-analysis/blocks/default-template';
import { COMMENTARY_BLOCKS, getBlockDef } from './registry';

/**
 * 저장된 설정을 현재 레지스트리에 맞춰 정합화.
 * - 저장 이후 **새로 추가된 블록**은 `def.defaultEnabled` 를 따라 뒤에 붙는다.
 *   기본 구성 블록(`true`)은 켜져서 신규 기능이 조용히 누락되지 않고,
 *   특정 프리셋 전용 블록(`false`)은 꺼진 채 붙어 기존 문서에 멋대로 나타나지 않는다.
 * - 레지스트리에서 **사라진 블록**은 버린다
 * - 없어진 variant 를 가리키면 첫 variant 로 폴백
 * - locked 블록은 항상 켜진 상태로 강제
 */
export function normalizeTemplate(config: CommentaryTemplateConfig | null | undefined): CommentaryTemplateConfig {
  const base = config ?? DEFAULT_TEMPLATE;
  const seen = new Set<string>();
  const blocks: TemplateBlockConfig[] = [];

  for (const bc of base.blocks) {
    const def = getBlockDef(bc.id);
    if (!def || seen.has(bc.id)) continue;
    seen.add(bc.id);
    const variant = def.variants.find((v) => v.id === bc.variant)?.id ?? def.variants[0].id;
    blocks.push({ id: def.id, variant, enabled: def.locked ? true : bc.enabled !== false });
  }

  // 레지스트리에만 있는 신규 블록을 뒤에 추가.
  // locked 는 끌 수 없으므로 defaultEnabled 보다 우선한다(둘이 어긋나도 locked 가 이긴다).
  for (const def of COMMENTARY_BLOCKS) {
    if (seen.has(def.id)) continue;
    const fallbackVariant =
      DEFAULT_TEMPLATE.blocks.find((b) => b.id === def.id)?.variant ?? def.variants[0].id;
    const variant = def.variants.find((v) => v.id === fallbackVariant)?.id ?? def.variants[0].id;
    blocks.push({ id: def.id, variant, enabled: def.locked === true || def.defaultEnabled });
  }

  // 푸터는 항상 마지막 (사용자가 순서를 흩뜨려도 크레딧이 중간에 끼지 않게)
  const footerIdx = blocks.findIndex((b) => b.id === 'footer');
  if (footerIdx >= 0 && footerIdx !== blocks.length - 1) {
    blocks.push(blocks.splice(footerIdx, 1)[0]);
  }

  return {
    themeId: base.themeId || DEFAULT_TEMPLATE.themeId,
    layoutId: base.layoutId || DEFAULT_TEMPLATE.layoutId,
    copyId: base.copyId || DEFAULT_TEMPLATE.copyId,
    blocks,
  };
}

/** 렌더 대상 블록 해석 — enabled + available 을 통과한 블록만, 섹션 번호 부여 */
export function resolveBlocks(
  config: CommentaryTemplateConfig | null | undefined,
  commentary: CommentaryResult,
  questions: AnalyzedQuestion[],
): ResolvedBlock[] {
  const normalized = normalizeTemplate(config);
  const out: ResolvedBlock[] = [];
  let nextNum = 1;

  for (const bc of normalized.blocks) {
    if (!bc.enabled) continue;
    const def = getBlockDef(bc.id);
    if (!def) continue;
    if (!def.available(commentary, questions)) continue;

    const variant = def.variants.find((v) => v.id === bc.variant) ?? def.variants[0];
    const count = def.numberCount?.(commentary) ?? 0;
    const sectionNum = count > 0 ? String(nextNum).padStart(2, '0') : '';
    nextNum += count;

    out.push({ def, variant, sectionNum });
  }

  return out;
}
