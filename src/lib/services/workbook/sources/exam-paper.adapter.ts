import { prisma } from '@/lib/db';
import type { AnswerSpaceSize, WorkbookSectionItem } from '@prisma/client';
import type { NormalizedItem } from '../types';

/**
 * ExamPaper(기출 시험지)에 추출된 모든 Question을 NormalizedItem[]로 펼친다.
 *
 * Question.examPaperId FK로 매칭. questionNum 오름차순 → 원본 시험지 순서 유지.
 * 추출이 되지 않은 시험지는 빈 배열 (graceful degradation).
 */
export async function expandExamPaperItem(
  item: Pick<
    WorkbookSectionItem,
    'id' | 'examPaperId' | 'answerSpace' | 'customLabel' | 'hideQuestionNum'
  >,
): Promise<NormalizedItem[]> {
  if (!item.examPaperId) return [];

  const questions = await prisma.question.findMany({
    where: { examPaperId: item.examPaperId },
    orderBy: { questionNum: 'asc' },
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
  if (questions.length === 0) return [];

  return questions.map((q, idx) => ({
    itemId: `${item.id}::${q.id}`,
    kind: 'EXAM_PAPER' as const,
    displayNumber: item.hideQuestionNum && idx === 0
      ? ''
      : (item.customLabel && idx === 0 ? item.customLabel : `${q.questionNum}.`),
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
