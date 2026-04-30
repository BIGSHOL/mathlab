import { prisma } from '@/lib/db';
import { getTestQuestionIds } from '@/lib/utils/question-order';
import type { AnswerSpaceSize, WorkbookSectionItem } from '@prisma/client';
import type { NormalizedItem } from '../types';

/**
 * Test 한 개를 NormalizedItem[]로 펼친다.
 *
 * 시험지에 포함된 모든 문항을 sortOrder 순으로 반환.
 * customLabel과 hideQuestionNum이 지정되면 첫 번째 문항에만 적용.
 */
export async function expandTestItem(
  item: Pick<WorkbookSectionItem, 'id' | 'testId' | 'answerSpace' | 'customLabel' | 'hideQuestionNum'>,
): Promise<NormalizedItem[]> {
  if (!item.testId) return [];

  const [test, questionIds] = await Promise.all([
    prisma.test.findUnique({
      where: { id: item.testId },
      select: { id: true, title: true, grade: true },
    }),
    getTestQuestionIds(item.testId),
  ]);

  if (!test || questionIds.length === 0) return [];

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      content: true,
      choices: true,
      choiceColumns: true,
      answer: true,
      explanation: true,
      difficulty: true,
      type: true,
      questionNum: true,
    },
  });

  // sortOrder 순서 보존
  const byId = new Map(questions.map(q => [q.id, q]));
  const ordered = questionIds.map(id => byId.get(id)).filter((q): q is NonNullable<typeof q> => !!q);

  return ordered.map((q, idx) => ({
    itemId: `${item.id}::${q.id}`,
    kind: 'TEST_PAPER' as const,
    displayNumber: item.hideQuestionNum && idx === 0
      ? ''
      : (item.customLabel && idx === 0 ? item.customLabel : `${idx + 1}.`),
    answerSpace: item.answerSpace as AnswerSpaceSize,
    questionContent: q.content,
    choices: (q.choices as string[] | null) ?? undefined,
    choiceColumns: q.choiceColumns as 1 | 2 | null,
    answer: q.answer,
    explanation: q.explanation ?? undefined,
    difficulty: q.difficulty,
    questionType: q.type,
  }));
}
