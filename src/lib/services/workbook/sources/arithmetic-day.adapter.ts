import { prisma } from '@/lib/db';
import type { AnswerSpaceSize, WorkbookSectionItem } from '@prisma/client';
import type { NormalizedItem } from '../types';

interface ArithmeticProblemRecord {
  content: string;
  answer: string;
  choices?: string[];
  category?: string;
  level?: string;
}

/**
 * ArithmeticHomeworkPlan의 특정 일차(dayIndex) 연산 문제 묶음을 NormalizedItem[]로 펼친다.
 *
 * dailyProblems Json은 GeneratedProblem[][] 형태 — 일차별 문제 배열.
 * 각 문제를 객관식/주관식에 관계없이 1개 항목으로 변환.
 */
export async function expandArithmeticDayItem(
  item: Pick<
    WorkbookSectionItem,
    'id' | 'arithmeticPlanId' | 'arithmeticDayIndex' | 'answerSpace' | 'customLabel' | 'hideQuestionNum'
  >,
  positionInSection: number,
): Promise<NormalizedItem[]> {
  if (!item.arithmeticPlanId || item.arithmeticDayIndex == null) return [];

  const plan = await prisma.arithmeticHomeworkPlan.findUnique({
    where: { id: item.arithmeticPlanId },
    select: { dailyProblems: true, totalDays: true },
  });
  if (!plan) return [];

  const allDays = plan.dailyProblems as unknown as ArithmeticProblemRecord[][] | null;
  if (!allDays || !Array.isArray(allDays)) return [];

  const dayProblems = allDays[item.arithmeticDayIndex];
  if (!dayProblems || dayProblems.length === 0) return [];

  return dayProblems.map((p, idx) => {
    const num = positionInSection + idx + 1;
    const choices = Array.isArray(p.choices) && p.choices.length > 0 ? p.choices : undefined;
    return {
      itemId: `${item.id}::${idx}`,
      kind: 'ARITHMETIC_DAY' as const,
      displayNumber: item.hideQuestionNum && idx === 0
        ? ''
        : (item.customLabel && idx === 0 ? item.customLabel : `${num}.`),
      answerSpace: item.answerSpace as AnswerSpaceSize,
      questionContent: p.content,
      choices,
      answer: p.answer,
      questionType: choices ? 'MULTIPLE_CHOICE' : 'SHORT_ANSWER',
    };
  });
}
