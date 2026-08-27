import { getEnglishTopicOptionsGrouped as getEnglishTopicGroups } from '@/lib/exam-analysis/english-topics';
import type { TopicOptionGroup, TopicOptionsOptions } from '../shared/topic-options';

export function getEnglishTopicOptionsByGrade(
  grade: string | null | undefined,
  opts?: TopicOptionsOptions,
): string[] {
  return Array.from(
    new Set(getEnglishTopicOptionsGrouped(grade, opts).flatMap((group) => group.options.map((option) => option.value))),
  );
}

export function getEnglishTopicOptionsGrouped(
  grade: string | null | undefined,
  opts?: TopicOptionsOptions,
): TopicOptionGroup[] {
  if (!grade) return [];
  return getEnglishTopicGroups(grade.trim(), opts);
}
