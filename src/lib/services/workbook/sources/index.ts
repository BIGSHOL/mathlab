import type { WorkbookSectionItem } from '@prisma/client';
import { expandTestItem } from './test.adapter';
import { expandQuestionItem } from './question.adapter';
import { expandConceptItem } from './concept.adapter';
import type { NormalizedItem } from '../types';

/**
 * kind에 따라 적절한 어댑터로 dispatch.
 *
 * MVP는 TEST_PAPER/QUESTION/CONCEPT_DOC 3종만 지원.
 * 나머지(ARITHMETIC_DAY/EXAM_PAPER/HOMEWORK_DAY)는 후속 PR에서 추가.
 *
 * @param item DB의 WorkbookSectionItem
 * @param positionInSection 섹션 내 0-based 위치 (단일 Question 번호 매김용)
 */
export async function dispatchAdapter(
  item: WorkbookSectionItem,
  positionInSection: number,
): Promise<NormalizedItem[]> {
  switch (item.kind) {
    case 'TEST_PAPER':
      return expandTestItem(item);
    case 'QUESTION':
      return expandQuestionItem(item, positionInSection);
    case 'CONCEPT_DOC':
      return expandConceptItem(item);
    case 'ARITHMETIC_DAY':
    case 'EXAM_PAPER':
    case 'HOMEWORK_DAY':
      // 후속 PR에서 구현 — 현재는 빈 배열 반환하여 graceful degradation
      return [];
    default:
      return [];
  }
}

/**
 * 섹션 단위로 모든 아이템을 펼쳐 NormalizedItem[]로 반환.
 *
 * 같은 섹션 내에서 단일 Question에 연속 번호(1,2,3...)를 부여하기 위해
 * positionInSection을 카운터로 전달.
 */
export async function expandSectionItems(
  items: WorkbookSectionItem[],
): Promise<NormalizedItem[]> {
  let questionPosition = 0;
  const results: NormalizedItem[] = [];

  for (const item of items) {
    const expanded = await dispatchAdapter(item, questionPosition);
    results.push(...expanded);
    if (item.kind === 'QUESTION') questionPosition += 1;
  }

  return results;
}

export type { NormalizedItem } from '../types';
export { getRecommendedAnswerSpace } from '../types';
