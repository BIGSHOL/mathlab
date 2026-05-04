import type { LearningStage } from '@/types';

export const FONT_SIZES = [
  { key: 0, label: '기본', size: '20px', readingLeading: '2.25rem', blankLeading: '2rem' },
  { key: 1, label: '크게', size: '22px', readingLeading: '2.5rem', blankLeading: '2.25rem' },
  { key: 2, label: '더크게', size: '24px', readingLeading: '2.75rem', blankLeading: '2.5rem' },
  { key: 3, label: '매우크게', size: '26px', readingLeading: '3rem', blankLeading: '2.75rem' },
] as const;

export const BASE_STAGES = [
  { key: 'READING' as LearningStage, label: '개념학습', color: 'bg-stage-reading', icon: '1' },
  { key: 'BLANK_EASY' as LearningStage, label: '빈칸 1단계', color: 'bg-stage-blank-easy', icon: '2' },
  { key: 'BLANK_HARD' as LearningStage, label: '빈칸 2단계', color: 'bg-stage-blank-hard', icon: '3' },
  { key: 'BLANK_FULL' as LearningStage, label: '통문장 암기', color: 'bg-stage-blank-page', icon: '4' },
];

export const BLANK_PAGE_STAGE = { key: 'BLANK_PAGE' as LearningStage, label: '백지복원', color: 'bg-violet-500', icon: '5' };
