import { z } from 'zod';

export const conceptQuerySchema = z.object({
  subjectId: z.string().optional(),
  gradeLevel: z.coerce.number().int().min(1).max(9).optional(),
  grade: z.string().optional(),
  category: z.string().optional(),
  part: z.string().optional(),
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
  category: z.string().max(20).optional(),
  part: z.string().max(20).optional(),
  keywords: z.string().optional(),
  sortOrder: z.number().int().default(0),
  prerequisites: z.array(z.string()).optional(),
});

export const updateConceptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  fullContent: z.string().min(1).optional(),
  conceptCode: z.string().max(20).optional().nullable(),
  grade: z.string().max(20).optional().nullable(),
  category: z.string().max(20).optional().nullable(),
  part: z.string().max(20).optional().nullable(),
  keywords: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  prerequisites: z.array(z.string()).optional(),
});

export const blankQuerySchema = z.object({
  level: z.coerce.number().int().min(1).max(2),
});

export type ConceptQuery = z.infer<typeof conceptQuerySchema>;
export type CreateConceptInput = z.infer<typeof createConceptSchema>;
export type UpdateConceptInput = z.infer<typeof updateConceptSchema>;
export type BlankQuery = z.infer<typeof blankQuerySchema>;
