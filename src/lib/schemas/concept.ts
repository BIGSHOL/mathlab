import { z } from 'zod';

export const conceptQuerySchema = z.object({
  subjectId: z.string().optional(),
  gradeLevel: z.coerce.number().int().min(1).max(9).optional(),
  grade: z.string().optional(),
  category: z.string().optional(),
  part: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(2).optional(),
  chapter: z.string().optional(),
  section: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// 기본 필드 정의 — create/update/bulk 모두 이 정의를 공유
const conceptBaseFields = {
  title: z.string().min(1).max(200),
  fullContent: z.string().min(1),
  conceptCode: z.string().max(20).optional(),
  grade: z.string().max(20).optional(),
  semester: z.number().int().min(1).max(2).optional(),
  chapter: z.string().max(100).optional(),
  section: z.string().max(100).optional(),
  sectionSub: z.string().max(100).optional(),
  category: z.string().max(20).optional(),
  part: z.string().max(20).optional(),
  source: z.string().max(200).optional(),
  keywords: z.string().optional(),
};

export const createConceptSchema = z.object({
  subjectId: z.string().min(1),
  ...conceptBaseFields,
  sortOrder: z.number().int().default(0),
  prerequisites: z.array(z.string()).optional(),
});

// update = base 필드 전부 optional + nullable 파생
export const updateConceptSchema = z.object({
  ...Object.fromEntries(
    Object.entries(conceptBaseFields).map(([k, v]) => [k, v.optional().nullable()])
  ),
  sortOrder: z.number().int().optional(),
  prerequisites: z.array(z.string()).optional(),
});

// bulk = base 필드만 (subjectId는 외부에서 전달)
export const bulkConceptItemSchema = z.object(conceptBaseFields);

export const bulkCreateConceptSchema = z.object({
  subjectId: z.string().min(1),
  concepts: z.array(bulkConceptItemSchema).min(1, '최소 1개의 개념이 필요합니다').max(200, '최대 200개까지 가능합니다'),
});

export const blankQuerySchema = z.object({
  level: z.coerce.number().int().min(1).max(3),
});

export type ConceptQuery = z.infer<typeof conceptQuerySchema>;
export type CreateConceptInput = z.infer<typeof createConceptSchema>;
export type UpdateConceptInput = z.infer<typeof updateConceptSchema>;
export type BlankQuery = z.infer<typeof blankQuerySchema>;

export const bulkBlankItemSchema = z.object({
  position: z.number().int().min(1),
  answer: z.string().min(1),
  hint: z.string(),
  difficulty: z.enum(['easy', 'hard', 'full']).optional().default('easy'),
});

export const bulkBlankExerciseSchema = z.object({
  conceptId: z.string().min(1),
  exercises: z.array(z.object({
    level: z.number().int().min(1).max(2),
    templateText: z.string().min(1),
    blanks: z.array(bulkBlankItemSchema).min(1),
  })).min(1),
});

export const bulkCreateBlanksSchema = z.object({
  items: z.array(bulkBlankExerciseSchema).min(1).max(200),
});

export type BulkConceptItem = z.infer<typeof bulkConceptItemSchema>;
export type BulkCreateConceptInput = z.infer<typeof bulkCreateConceptSchema>;
export type BulkCreateBlanksInput = z.infer<typeof bulkCreateBlanksSchema>;
