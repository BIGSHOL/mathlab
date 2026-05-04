/**
 * 워크북 항목/섹션 옵션 자동 추론 헬퍼
 *
 * 항목 종류·내용을 분석해 적절한 답란 크기와 섹션 단수를 추천한다.
 * 시드/생성 시점에 호출하여 DB에는 명시값을 저장한다 (사용자가 override 가능).
 *
 * 정책 요약:
 *   ARITHMETIC_DAY  → NONE (객관식 4지선다, 풀이공간 별도 종이)
 *   HOMEWORK_DAY    → MEDIUM (혼합, 안전한 중간값)
 *   CONCEPT_DOC     → NONE (개념 본문)
 *   OX_BUNDLE       → NONE (O/X 자체 답안)
 *   TEST_PAPER      → MEDIUM
 *   EXAM_PAPER      → MEDIUM
 *   QUESTION
 *     · 객관식 + 도형 X    → SMALL
 *     · 객관식 + 도형 O    → MEDIUM
 *     · 단답형             → SMALL
 *     · 서술형/긴 본문     → LARGE
 *     · 그 외(미상)        → MEDIUM
 *
 * 섹션 columns:
 *   2단으로 가능 — 모든 항목이 짧고 단순할 때 (ARITHMETIC_DAY 전용 섹션, 짧은 객관식 전용 등)
 *   1단 강제 — TEST_PAPER/EXAM_PAPER/CONCEPT_DOC/긴 서술형/도형 포함 항목이 하나라도 있으면
 */

import type { WorkbookSectionItemKind, AnswerSpaceSize } from '@prisma/client';

export interface ItemHeuristic {
  kind: WorkbookSectionItemKind;
  /** QUESTION/HOMEWORK_DAY 의 경우 — 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY' */
  questionType?: string;
  /** 본문 길이 (글자 수) */
  contentLength?: number;
  /** 도형/이미지 포함 여부 */
  hasDiagram?: boolean;
}

export function inferAnswerSpace(h: ItemHeuristic): AnswerSpaceSize {
  switch (h.kind) {
    case 'CONCEPT_DOC':
    case 'OX_BUNDLE':
    case 'ARITHMETIC_DAY':
      return 'NONE';

    case 'TEST_PAPER':
    case 'EXAM_PAPER':
    case 'HOMEWORK_DAY':
      return 'MEDIUM';

    case 'QUESTION': {
      if (h.questionType === 'MULTIPLE_CHOICE') {
        return h.hasDiagram ? 'MEDIUM' : 'SMALL';
      }
      if (h.questionType === 'SHORT_ANSWER') {
        return 'SMALL';
      }
      if (h.questionType === 'ESSAY') {
        return 'LARGE';
      }
      // 미상 (questionType 없음) — 본문 길이로 추정
      if ((h.contentLength ?? 0) > 200 || h.hasDiagram) return 'LARGE';
      return 'MEDIUM';
    }

    default:
      return 'MEDIUM';
  }
}

/**
 * 섹션의 항목 목록을 보고 적절한 단수 추론.
 * 한 항목이라도 "복잡"하면 1단으로 강제.
 */
export function inferColumns(items: ItemHeuristic[]): 1 | 2 {
  if (items.length === 0) return 1;

  const hasComplexKind = items.some(
    (it) => it.kind === 'TEST_PAPER' || it.kind === 'EXAM_PAPER' || it.kind === 'CONCEPT_DOC',
  );
  if (hasComplexKind) return 1;

  const hasLongContent = items.some(
    (it) => (it.contentLength ?? 0) > 200 || it.questionType === 'ESSAY' || it.hasDiagram,
  );
  if (hasLongContent) return 1;

  return 2;
}
