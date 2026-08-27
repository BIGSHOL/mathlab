import { getEnglishTopicOptionsByGrade, getEnglishTopicOptionsGrouped } from '../english/topic-options';
import { getMathTopicOptionsByGrade, getMathTopicOptionsGrouped } from '../math/topic-options';
import type { TopicOptionGroup, TopicOptionsOptions } from '../shared/topic-options';
import { toExamSubjectKey } from '@/lib/exam-analysis/subject';

export type { TopicOption, TopicOptionGroup, TopicOptionsOptions } from '../shared/topic-options';

export function getTopicOptionsByGrade(
  grade: string | null | undefined,
  subject: string | null | undefined = 'MATH',
  opts?: TopicOptionsOptions,
): string[] {
  return toExamSubjectKey(subject) === 'ENGLISH'
    ? getEnglishTopicOptionsByGrade(grade, opts)
    : getMathTopicOptionsByGrade(grade);
}

export function getTopicOptionsGrouped(
  grade: string | null | undefined,
  subject: string | null | undefined = 'MATH',
  opts?: TopicOptionsOptions,
): TopicOptionGroup[] {
  return toExamSubjectKey(subject) === 'ENGLISH'
    ? getEnglishTopicOptionsGrouped(grade, opts)
    : getMathTopicOptionsGrouped(grade);
}
