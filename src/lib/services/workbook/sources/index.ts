import type { WorkbookSectionItem } from '@prisma/client';
import { expandTestItem } from './test.adapter';
import { expandQuestionItem } from './question.adapter';
import { expandConceptItem } from './concept.adapter';
import { expandOxBundleItem } from './ox-bundle.adapter';
import { expandArithmeticDayItem } from './arithmetic-day.adapter';
import { expandExamPaperItem } from './exam-paper.adapter';
import { expandHomeworkDayItem } from './homework-day.adapter';
import type { NormalizedItem } from '../types';

/**
 * kind에 따라 적절한 어댑터로 dispatch.
 *
 * @param item DB의 WorkbookSectionItem
 * @param positionInSection 섹션 내 0-based 위치 (단일 항목/펼침형 번호 매김용)
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
    case 'OX_BUNDLE':
      return expandOxBundleItem(item, positionInSection);
    case 'ARITHMETIC_DAY':
      return expandArithmeticDayItem(item, positionInSection);
    case 'EXAM_PAPER':
      return expandExamPaperItem(item);
    case 'HOMEWORK_DAY':
      return expandHomeworkDayItem(item, positionInSection);
    default:
      return [];
  }
}

/**
 * 섹션 단위로 모든 아이템을 펼쳐 NormalizedItem[]로 반환.
 *
 * 섹션 내 연속 번호 매김 정책:
 * - QUESTION/OX_BUNDLE/ARITHMETIC_DAY/HOMEWORK_DAY: positionInSection 기반 — 펼친 N개만큼 카운터 증가
 * - TEST_PAPER: 자체 내부 번호(1, 2, 3 ...) 사용 → 카운터 미증가
 * - EXAM_PAPER: 원본 시험지의 questionNum 보존 → 카운터 미증가
 * - CONCEPT_DOC: 번호 미부여 → 카운터 미증가
 */
const ADVANCES_NUMBERING: ReadonlySet<WorkbookSectionItem['kind']> = new Set([
  'QUESTION',
  'OX_BUNDLE',
  'ARITHMETIC_DAY',
  'HOMEWORK_DAY',
]);

export async function expandSectionItems(
  items: WorkbookSectionItem[],
): Promise<NormalizedItem[]> {
  let questionPosition = 0;
  const results: NormalizedItem[] = [];

  for (const item of items) {
    const expanded = await dispatchAdapter(item, questionPosition);
    results.push(...expanded);
    if (ADVANCES_NUMBERING.has(item.kind)) {
      questionPosition += expanded.length;
    }
  }

  return results;
}

export type { NormalizedItem } from '../types';
export { getRecommendedAnswerSpace } from '../types';
