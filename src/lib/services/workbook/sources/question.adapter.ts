import { prisma } from '@/lib/db';
import type { AnswerSpaceSize, WorkbookSectionItem } from '@prisma/client';
import type { NormalizedItem } from '../types';

/**
 * 단일 Question 한 개를 NormalizedItem 한 개로 변환.
 *
 * 문제은행 자유 선택, 시험·숙제 부분 발췌 등 공통 사용.
 */
export async function expandQuestionItem(
  item: Pick<WorkbookSectionItem, 'id' | 'questionId' | 'answerSpace' | 'customLabel' | 'hideQuestionNum'>,
  positionInSection: number,
): Promise<NormalizedItem[]> {
  if (!item.questionId) return [];

  const q = await prisma.question.findUnique({
    where: { id: item.questionId },
    select: {
      id: true,
      content: true,
      choices: true,
      choiceColumns: true,
      answer: true,
      explanation: true,
      difficulty: true,
      type: true,
    },
  });
  if (!q) return [];

  const num = positionInSection + 1;
  return [{
    itemId: item.id,
    kind: 'QUESTION' as const,
    displayNumber: item.hideQuestionNum
      ? ''
      : (item.customLabel ?? `${num}.`),
    answerSpace: item.answerSpace as AnswerSpaceSize,
    questionContent: q.content,
    choices: (q.choices as string[] | null) ?? undefined,
    choiceColumns: q.choiceColumns as 1 | 2 | null,
    answer: q.answer,
    explanation: q.explanation ?? undefined,
    difficulty: q.difficulty,
    questionType: q.type,
  }];
}
