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
  textbookId: z.string().max(120).optional().nullable(),
  schoolName: z.string().max(100).optional().nullable(),
  schoolId: z.string().max(50).optional().nullable(),
  examType: z.enum(['blank', 'student']).default('blank'),
  studentId: z.string().optional().nullable(),
  // 파일명에서 추출 불가한 필드 — 선생님이 직접 입력
  examYear: z.number().int().min(2000).max(2100).optional().nullable(),
  examSemester: z.number().int().min(0).max(2).optional().nullable(),
  examCategory: z.enum(['MIDTERM', 'FINAL', 'MOCK', 'OTHER']).optional().nullable(),
});

// ── 시험지 수정 ──
export const examPaperUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.enum(['MATH', 'ENGLISH']).optional(),
  grade: z.string().optional(),
  category: z.string().max(50).optional().nullable(),
  unit: z.string().max(200).optional().nullable(),
  // ⚠️ 배열만 받으면 신형 `{ topics, examYear, examSemester, examCategory }` 객체가
  //    통째로 배열로 덮여 회차 메타가 사라진다(주변학교 비교·블로그 캡션이 이걸 읽는다).
  //    지금은 이 PATCH 에 examScope 를 보내는 클라이언트가 없지만, 생기는 순간
  //    조용히 파괴되므로 두 형태를 모두 받는다.
  examScope: z
    .union([
      z.array(z.string()),
      z.object({
        topics: z.array(z.string()).optional(),
        examYear: z.number().optional().nullable(),
        examSemester: z.number().optional().nullable(),
        examCategory: z.string().optional().nullable(),
      }).passthrough(),
    ])
    .optional()
    .nullable(),
  /** 학교 공지 실측 지표. 값이 하나도 없으면 서버가 null 로 정규화해 컬럼을 비운다.
   *  `enteredBy`/`enteredAt` 은 **서버가 찍는다** — 클라이언트가 입력자를 사칭하지 못하게. */
  examStats: z
    .object({
      subjectAverage: z.number().min(0).max(100).optional().nullable(),
      examinees: z.number().min(0).max(100000).optional().nullable(),
      standardDeviation: z.number().min(0).max(100).optional().nullable(),
      achievement: z
        .object({
          A: z.number().min(0).max(100).optional().nullable(),
          B: z.number().min(0).max(100).optional().nullable(),
          C: z.number().min(0).max(100).optional().nullable(),
          D: z.number().min(0).max(100).optional().nullable(),
          E: z.number().min(0).max(100).optional().nullable(),
        })
        .optional()
        .nullable(),
      source: z.string().max(60).optional().nullable(),
    })
    .optional()
    .nullable(),
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
