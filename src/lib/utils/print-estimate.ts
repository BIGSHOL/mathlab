/**
 * 인쇄 페이지 분할용 문항 높이 추정 유틸
 *
 * tests/[id]/print, worksheet-wizard/Step3, workbook-print 페이지가 공통 사용한다.
 * 워크북에서 풀이공간(answerSpace)과 백지인출 체크박스(hasCheckbox)를 추가 합산하기 위해
 * 옵션 매개변수로 확장했다.
 *
 * LevelTestTab.tsx는 별도 알고리즘(solveArea/choiceGap 매개변수)을 쓰므로 이 유틸과 분리.
 */

export type AnswerSpaceSize = 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

/** A4 한 페이지의 문항 영역 가용 높이(px) — 헤더/푸터 제외 */
export const PAGE_CONTENT_HEIGHT = 880;

/** 풀이공간 슬롯의 픽셀 높이 (96dpi 기준) */
export const ANSWER_SPACE_PX: Record<AnswerSpaceSize, number> = {
  NONE: 0,
  SMALL: 76,    // ~20mm
  MEDIUM: 170,  // ~45mm
  LARGE: 302,   // ~80mm
  XLARGE: 453,  // ~120mm
};

const ITEM_VERTICAL_PADDING_PX = 16; // 문항 상하 여백 합
const CHECKBOX_HEAD_PX = 24;          // □ 체크박스 + 라벨 한 줄

export interface EstimateInput {
  contentMarkdown: string;
  choices?: string[] | null;
  /** DB choiceColumns 우선, null/undefined면 보기 길이로 자동 판단 */
  choiceColumns?: 1 | 2 | null;
  template: string;        // 'default' | 'exam' | 'large' | ... (PrintTemplate)
  columns: 1 | 2;          // 페이지 1단/2단
  spacing: number;         // 문항 간 여백(px)
  answerSpace?: AnswerSpaceSize;
  hasCheckbox?: boolean;
}

/** KaTeX 수식을 짧은 플레이스홀더로 치환하여 렌더링 기준 글자수 추정 */
export function estimateRenderedLength(text: string): number {
  return text.replace(/\$\$[^$]+\$\$/g, '@@@@').replace(/\$[^$]+\$/g, '@@').length;
}

/** 보기 1열/2열 결정 (DB 값 우선, 없으면 길이 기반) */
export function resolveChoiceCols(
  choices: string[] | null | undefined,
  choiceColumns?: 1 | 2 | null,
): 1 | 2 {
  if (choiceColumns === 1) return 1;
  if (choiceColumns === 2) return 2;
  if (!choices || choices.length === 0) return 2;
  const maxLen = Math.max(...choices.map(c => c.replace(/^[①②③④⑤]\s*/, '').length));
  return maxLen > 25 ? 1 : 2;
}

/**
 * 문항이 인쇄 시 차지할 대략적인 높이(px)를 추정한다.
 *
 * 합산 항목: 패딩 + (체크박스) + 번호메타(45) + 본문라인 + 보기 행 + 풀이공간 + 문항간격
 */
export function estimateQuestionHeight(input: EstimateInput): number {
  const {
    contentMarkdown,
    choices,
    choiceColumns,
    template,
    columns,
    spacing,
    answerSpace = 'NONE',
    hasCheckbox = false,
  } = input;

  let h = ITEM_VERTICAL_PADDING_PX;
  if (hasCheckbox) h += CHECKBOX_HEAD_PX;

  h += 45; // 번호+메타 정보

  const isLarge = template === 'large';
  const charsPerLine = columns === 1 ? (isLarge ? 35 : 60) : (isLarge ? 20 : 30);
  const lines = Math.ceil(estimateRenderedLength(contentMarkdown) / charsPerLine);
  h += lines * (isLarge ? 34 : 24);

  if (choices && choices.length > 0) {
    const cols = resolveChoiceCols(choices, choiceColumns);
    const rows = Math.ceil(choices.length / cols);
    h += rows * (isLarge ? 36 : 28) + 10;
  }

  h += ANSWER_SPACE_PX[answerSpace];
  h += Math.max(0, spacing);

  return h;
}
