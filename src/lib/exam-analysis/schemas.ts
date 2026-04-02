/**
 * 기출 분석 Zod 검증 스키마
 */

import { z } from 'zod';
import { AGENT_TYPES } from './constants';

// ── 시험지 생성 ──
export const examPaperCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  subject: z.enum(['MATH', 'ENGLISH']).default('MATH'),
  grade: z.string().min(1, '학년을 선택하세요'),
  category: z.string().max(50).optional().nullable(),
  unit: z.string().max(200).optional().nullable(),
  examScope: z.array(z.string()).optional().nullable(),
  schoolName: z.string().max(100).optional().nullable(),
  schoolId: z.string().max(50).optional().nullable(),
  examType: z.enum(['blank', 'student']).default('blank'),
  studentId: z.string().optional().nullable(),
});

// ── 시험지 수정 ──
export const examPaperUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.enum(['MATH', 'ENGLISH']).optional(),
  grade: z.string().optional(),
  category: z.string().max(50).optional().nullable(),
  unit: z.string().max(200).optional().nullable(),
  examScope: z.array(z.string()).optional().nullable(),
  schoolName: z.string().max(100).optional().nullable(),
  schoolId: z.string().max(50).optional().nullable(),
  examType: z.enum(['blank', 'student']).optional(),
});

// ── 기본 분석 요청 ──
export const analyzeRequestSchema = z.object({
  forceReanalyze: z.boolean().default(false),
  analysisMode: z.enum(['questions_only', 'full']).default('questions_only'),
});

// ── 확장 분석 요청 ──
export const analyzeExtendedRequestSchema = z.object({
  agents: z.array(z.enum(AGENT_TYPES)).min(1, '분석 에이전트를 선택하세요'),
  forceRegenerate: z.boolean().default(false),
  includeNearby: z.boolean().default(true),
  includeYearCompare: z.boolean().default(true),
});

// ── 목록 조회 쿼리 ──
export const examPaperQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  subject: z.enum(['MATH', 'ENGLISH']).optional(),
  grade: z.string().optional(),
  status: z.enum(['PENDING', 'ANALYZING', 'COMPLETED', 'FAILED']).optional(),
  studentId: z.string().optional(),
  search: z.string().optional(),
});

export type ExamPaperCreateInput = z.infer<typeof examPaperCreateSchema>;
export type ExamPaperUpdateInput = z.infer<typeof examPaperUpdateSchema>;
export type AnalyzeRequestInput = z.infer<typeof analyzeRequestSchema>;
export type AnalyzeExtendedInput = z.infer<typeof analyzeExtendedRequestSchema>;
export type ExamPaperQueryInput = z.infer<typeof examPaperQuerySchema>;
