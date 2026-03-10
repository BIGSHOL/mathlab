import { z } from 'zod';

const questionDifficultyEnum = z.enum(['BASIC', 'MEDIUM', 'HIGH', 'HIGHEST']);
const questionTypeEnum = z.enum(['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY']);

export const questionQuerySchema = z.object({
  bookCode: z.string().optional(),
  chapter: z.string().optional(),
  section: z.string().optional(),
  difficulty: questionDifficultyEnum.optional(),
  type: questionTypeEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createQuestionSchema = z.object({
  bookCode: z.string().min(1).max(10),
  chapter: z.string().min(1).max(200),
  section: z.string().max(200).optional(),
  questionNum: z.number().int().min(1),
  pageNum: z.number().int().min(1).optional(),
  difficulty: questionDifficultyEnum,
  type: questionTypeEnum,
  content: z.string().min(1, '문제 내용을 입력해주세요'),
  choices: z.array(z.string()).min(2).max(5).optional(),
  answer: z.string().min(1, '정답을 입력해주세요'),
  explanation: z.string().optional(),
  sourceTag: z.string().max(100).optional(),
});

export const updateQuestionSchema = z.object({
  chapter: z.string().min(1).max(200).optional(),
  section: z.string().max(200).optional().nullable(),
  difficulty: questionDifficultyEnum.optional(),
  type: questionTypeEnum.optional(),
  content: z.string().min(1).optional(),
  choices: z.array(z.string()).min(2).max(5).optional().nullable(),
  answer: z.string().min(1).optional(),
  explanation: z.string().optional().nullable(),
  sourceTag: z.string().max(100).optional().nullable(),
});

export type QuestionQuery = z.infer<typeof questionQuerySchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
