import type { AnswerSpaceSize, WorkbookSectionItemKind } from '@prisma/client';

/**
 * 어댑터 레이어가 출력하는 통일된 표현형.
 * 인쇄/미리보기 컴포넌트는 이 형태만 안다.
 *
 * 6종 컨텐츠 소스(Test/Question/ArithmeticDay/Concept/ExamPaper/HomeworkDay)를
 * 모두 NormalizedItem[]로 변환하여 polymorphism을 흡수한다.
 */
export interface NormalizedItem {
  /** WorkbookSectionItem.id (또는 임시 id) */
  itemId: string;
  kind: WorkbookSectionItemKind;
  /** 인쇄에 표시될 번호/라벨 — 예: "1.", "1-(1)", "단원1" */
  displayNumber: string;
  /** 풀이공간 크기 (NONE이면 빈칸 미인쇄) */
  answerSpace: AnswerSpaceSize;

  // ── 문항형 (TEST_PAPER/QUESTION/ARITHMETIC_DAY/EXAM_PAPER/HOMEWORK_DAY) ──
  questionContent?: string;     // KaTeX 마크다운
  choices?: string[];
  choiceColumns?: 1 | 2 | null;
  answer?: string;
  explanation?: string;
  difficulty?: string;          // 'BASIC'|'MEDIUM'|'HIGH'|'HIGHEST'
  questionType?: string;        // 'MULTIPLE_CHOICE'|'SHORT_ANSWER'|'ESSAY'

  // ── 문서형 (CONCEPT_DOC) ──
  documentTitle?: string;
  documentMarkdown?: string;    // Concept.fullContent

  /** 추정 높이 (px) — 페이지 분할 알고리즘 입력 */
  estimatedHeightPx?: number;
}

/** 풀이공간 크기 자동 추천 */
export function getRecommendedAnswerSpace(item: {
  questionType?: string;
  difficulty?: string;
  choices?: string[] | null;
}): AnswerSpaceSize {
  const hasChoices = !!item.choices && item.choices.length > 0;
  const isHighDifficulty = item.difficulty === 'HIGH' || item.difficulty === 'HIGHEST';
  const isEssay = item.questionType === 'ESSAY';

  if (isEssay && isHighDifficulty) return 'XLARGE';
  if (isEssay) return 'LARGE';
  if (!hasChoices && isHighDifficulty) return 'LARGE';
  if (!hasChoices) return 'MEDIUM';
  if (hasChoices && isHighDifficulty) return 'LARGE';
  return 'SMALL';
}
