import { z } from 'zod';

const stageEnum = z.enum(['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL', 'BLANK_PAGE']);

export const completeStageSchema = z.object({
  conceptId: z.string().min(1, '개념 ID가 필요합니다'),
  stage: stageEnum,
});

export const blankSubmitSchema = z.object({
  exerciseId: z.string().min(1, '문제 ID가 필요합니다'),
  answers: z.array(
    z.object({
      position: z.number().int().min(1),
      value: z.string().min(1, '빈칸을 모두 채워주세요'),
    })
  ).min(1, '답안을 입력해주세요'),
});

export const blankPageSubmitSchema = z.object({
  conceptId: z.string().min(1, '개념 ID가 필요합니다'),
  content: z.string().min(10, '최소 10자 이상 작성해주세요'),
});

export type CompleteStageInput = z.infer<typeof completeStageSchema>;
export type BlankSubmitInput = z.infer<typeof blankSubmitSchema>;
export type BlankPageSubmitInput = z.infer<typeof blankPageSubmitSchema>;
