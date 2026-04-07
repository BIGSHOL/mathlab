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
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

// 기본 필드 정의 — create/update/bulk 모두 이 정의를 공유
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
  scoringCriteria: z.string().optional().nullable(),
  source: z.string().max(200).optional(),
  sourceTag: z.string().max(100).optional(),
  domain: z.string().max(30).optional().nullable(),
  abilityDomain: z.string().max(30).optional().nullable(),
  conceptId: z.string().optional().nullable(),
  diagramSpec: z.any().optional().nullable(),
  diagramSVG: z.string().optional().nullable(),
});

// update = create의 모든 필드를 optional + nullable로 파생
export const updateQuestionSchema = createQuestionSchema
  .omit({ bookCode: true, questionNum: true, pageNum: true })
  .partial()
  .extend({
    // nullable 허용이 필요한 필드만 명시적 override
    section: z.string().max(200).optional().nullable(),
    choices: z.array(z.string()).min(2).max(5).optional().nullable(),
    explanation: z.string().optional().nullable(),
    scoringCriteria: z.string().optional().nullable(),
    source: z.string().max(200).optional().nullable(),
    sourceTag: z.string().max(100).optional().nullable(),
    choiceColumns: z.number().int().min(1).max(2).optional().nullable(),
  });

export const bulkCreateQuestionsSchema = z.object({
  questions: z.array(createQuestionSchema).min(1).max(200),
});

export type QuestionQuery = z.infer<typeof questionQuerySchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type BulkCreateQuestionsInput = z.infer<typeof bulkCreateQuestionsSchema>;
