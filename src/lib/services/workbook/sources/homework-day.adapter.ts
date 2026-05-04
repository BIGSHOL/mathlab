import { prisma } from '@/lib/db';
import { getHomeworkDayQuestionIds } from '@/lib/utils/question-order';
import type { AnswerSpaceSize, WorkbookSectionItem } from '@prisma/client';
import type { NormalizedItem } from '../types';

/**
 * QuestionHomeworkPlan의 특정 일차(dayIndex)에 속한 문제들을 NormalizedItem[]로 펼친다.
 *
 * HomeworkQuestion 중간테이블 → sortOrder 순으로 Question 조회.
 * 문제 순서 헬퍼(getHomeworkDayQuestionIds)를 통해 Json/중간테이블 dual-write 모두 호환.
 */
export async function expandHomeworkDayItem(
  item: Pick<
    WorkbookSectionItem,
    'id' | 'homeworkPlanId' | 'homeworkDayIndex' | 'answerSpace' | 'customLabel' | 'hideQuestionNum'
  >,
  positionInSection: number,
): Promise<NormalizedItem[]> {
  if (!item.homeworkPlanId || item.homeworkDayIndex == null) return [];

  const questionIds = await getHomeworkDayQuestionIds(item.homeworkPlanId, item.homeworkDayIndex);
  if (questionIds.length === 0) return [];

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
    },
  });

  // sortOrder 순서 보존 (findMany는 비결정적)
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered = questionIds
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => !!q);

  return ordered.map((q, idx) => {
    const num = positionInSection + idx + 1;
    return {
      itemId: `${item.id}::${q.id}`,
      kind: 'HOMEWORK_DAY' as const,
      displayNumber: item.hideQuestionNum && idx === 0
        ? ''
        : (item.customLabel && idx === 0 ? item.customLabel : `${num}.`),
      answerSpace: item.answerSpace as AnswerSpaceSize,
      questionContent: q.content,
      choices: (q.choices as string[] | null) ?? undefined,
      choiceColumns: q.choiceColumns as 1 | 2 | null,
      answer: q.answer,
      explanation: q.explanation ?? undefined,
      difficulty: q.difficulty,
      questionType: q.type,
    };
  });
}
