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

export const createConceptSchema = z.object({
  subjectId: z.string().min(1),
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
  sortOrder: z.number().int().default(0),
  prerequisites: z.array(z.string()).optional(),
});

export const updateConceptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  fullContent: z.string().min(1).optional(),
  conceptCode: z.string().max(20).optional().nullable(),
  grade: z.string().max(20).optional().nullable(),
  semester: z.number().int().min(1).max(2).optional().nullable(),
  chapter: z.string().max(100).optional().nullable(),
  section: z.string().max(100).optional().nullable(),
  sectionSub: z.string().max(100).optional().nullable(),
  category: z.string().max(20).optional().nullable(),
  part: z.string().max(20).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  keywords: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  prerequisites: z.array(z.string()).optional(),
});

export const blankQuerySchema = z.object({
  level: z.coerce.number().int().min(1).max(2),
});

export const bulkConceptItemSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다').max(200),
  fullContent: z.string().min(1, '내용은 필수입니다'),
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
});

export const bulkCreateConceptSchema = z.object({
  subjectId: z.string().min(1),
  concepts: z.array(bulkConceptItemSchema).min(1, '최소 1개의 개념이 필요합니다').max(200, '최대 200개까지 가능합니다'),
});

export type ConceptQuery = z.infer<typeof conceptQuerySchema>;
export type CreateConceptInput = z.infer<typeof createConceptSchema>;
export type UpdateConceptInput = z.infer<typeof updateConceptSchema>;
export type BlankQuery = z.infer<typeof blankQuerySchema>;
export type BulkConceptItem = z.infer<typeof bulkConceptItemSchema>;
export type BulkCreateConceptInput = z.infer<typeof bulkCreateConceptSchema>;
