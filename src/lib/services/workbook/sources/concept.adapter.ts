import { prisma } from '@/lib/db';
import type { AnswerSpaceSize, WorkbookSectionItem } from '@prisma/client';
import type { NormalizedItem } from '../types';

/**
 * `inlineData`에 보관되는 개념 인쇄 옵션.
 *
 * blankLevel:
 *  - 0: 빈칸 없음 (원본 fullContent)
 *  - 1: BLANK_EASY — 핵심 용어만 빈칸
 *  - 2: BLANK_HARD — easy + hard 빈칸
 *  - 3: BLANK_FULL — 통문장 (모든 학습 가능 단어 빈칸)
 */
type ConceptInlineData = {
  blankLevel?: 0 | 1 | 2 | 3;
};

/**
 * `{{N}}` 형식의 placeholder를 인쇄용 밑줄/박스로 치환.
 * 전각 밑줄(＿)을 사용하여 마크다운/KaTeX 충돌 방지.
 */
function fillPlaceholders(template: string): string {
  return template.replace(/\{\{\d+\}\}/g, '＿＿＿＿＿');
}

/**
 * Concept 문서 한 개를 NormalizedItem 한 개(CONCEPT_DOC)로 변환.
 *
 * inlineData.blankLevel에 따라:
 *  - 0: 원본 fullContent
 *  - 1|2: BlankExercise(level=1|2)의 templateText 사용
 *  - 3: 통문장 빈칸 — `**굵은 글씨**`/`__강조__` 패턴을 기준으로 빈칸 처리
 *
 * 풀이공간은 사용자가 명시적으로 지정한 값을 그대로 사용.
 */
export async function expandConceptItem(
  item: Pick<WorkbookSectionItem, 'id' | 'conceptId' | 'answerSpace' | 'customLabel' | 'inlineData'>,
): Promise<NormalizedItem[]> {
  if (!item.conceptId) return [];

  const concept = await prisma.concept.findUnique({
    where: { id: item.conceptId },
    select: { id: true, title: true, fullContent: true, chapter: true, section: true },
  });
  if (!concept) return [];

  const opts = (item.inlineData as ConceptInlineData | null) ?? {};
  const blankLevel = opts.blankLevel ?? 0;

  let documentMarkdown = concept.fullContent;

  if (blankLevel === 1 || blankLevel === 2) {
    const dbLevel = blankLevel === 2 ? 2 : 1;
    const exercise = await prisma.blankExercise.findFirst({
      where: { conceptId: concept.id, level: dbLevel },
      select: { templateText: true },
    });
    if (exercise?.templateText) {
      documentMarkdown = fillPlaceholders(exercise.templateText);
    }
    // BlankExercise가 없으면 graceful fallback — 원본 fullContent 그대로
  } else if (blankLevel === 3) {
    documentMarkdown = blankAllStrongMarks(concept.fullContent);
  }

  return [{
    itemId: item.id,
    kind: 'CONCEPT_DOC' as const,
    displayNumber: item.customLabel ?? '',
    answerSpace: item.answerSpace as AnswerSpaceSize,
    documentTitle: concept.title,
    documentMarkdown,
  }];
}

/**
 * level 3 통문장 모드: 마크다운 강조 패턴(`**X**`, `__X__`)을 빈칸으로 치환.
 *
 * BlankExercise(level=1|2)는 `{{N}}` 플레이스홀더를 사용하지만, level=3은 별도 DB 데이터가 없으므로
 * fullContent의 강조 마크를 직접 빈칸 처리. KaTeX(`$...$`) 내부는 보호.
 *
 * 안전장치:
 *  - LaTeX 영역(`$...$` 또는 `$$...$$`) 내부의 `**`는 건드리지 않음 (수식 파괴 방지)
 *  - 결과는 KaTeX/마크다운과 충돌 없는 전각 밑줄
 */
function blankAllStrongMarks(text: string): string {
  // LaTeX 블록을 임시 토큰으로 보호 → 강조 치환 → 토큰 복원
  const tokens: string[] = [];
  const protect = text.replace(/\$\$[\s\S]+?\$\$|\$[^\n$]+\$/g, (match) => {
    const idx = tokens.length;
    tokens.push(match);
    return `LX${idx}`;
  });
  const blanked = protect
    .replace(/\*\*([^*\n]+)\*\*/g, () => '＿＿＿＿＿')
    .replace(/__([^_\n]+)__/g, () => '＿＿＿＿＿');
  return blanked.replace(/LX(\d+)/g, (_, n) => tokens[Number(n)] ?? '');
}
