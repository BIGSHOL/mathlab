import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';
import { getExamScope } from '@/lib/demo/accounts';
import { analyzeExam } from '@/lib/exam-analysis/ai-engine';
import { ExamPromptBuilder } from '@/lib/exam-analysis/prompt-builder';
import type { ExamContext } from '@/lib/exam-analysis/types';
import { toExamSubjectKey } from '@/lib/exam-analysis/subject';
import path from 'path';
import { readFile } from 'fs/promises';

/** fileUrl이 http(s) URL이면 fetch, 로컬 경로면 readFile */
async function loadFileAsBase64(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`파일 다운로드 실패: ${res.status} ${res.statusText}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf).toString('base64');
  }
  const filePath = path.join(process.cwd(), 'public', fileUrl);
  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

/**
 * 모듈 레벨 base64 이미지 캐시 — 같은 examPaperId의 이미지를 4개 모델 호출 시 1번만 로드.
 * Key: examPaperId+fileUrls, Value: base64 배열 + 캐시 만료 시각 (10분).
 * 메모리 절약 + 응답 속도 개선 (~5MB 이미지 × 3회 추가 로드 절약).
 */
const imageCache = new Map<string, { data: string[]; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10분

async function loadImagesWithCache(examPaperId: string, fileUrls: string[]): Promise<{ data: string[]; cached: boolean }> {
  const key = `${examPaperId}::${fileUrls.join(',')}`;
  const cached = imageCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.data, cached: true };
  }
  // 만료된 다른 항목 정리 (메모리 누수 방지)
  for (const [k, v] of imageCache.entries()) {
    if (v.expiresAt <= Date.now()) imageCache.delete(k);
  }
  // 새로 로드
  const data: string[] = [];
  for (const fileUrl of fileUrls) {
    data.push(await loadFileAsBase64(fileUrl));
  }
  imageCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return { data, cached: false };
}

type Params = { params: Promise<{ id: string }> };

const ALLOWED_MODELS = new Set([
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]);

/**
 * POST /api/exam-analysis/[id]/analyze-compare?model=gemini-3.5-flash
 *
 * 모델 비교용 임시 분석 API.
 * - DB에 저장하지 않음 (analysis 레코드 미생성)
 * - status도 변경 안 함 (ANALYZING 등으로 안 잠금)
 * - 결과 + 소요 시간 + 토큰 추정만 JSON 반환
 *
 * 목업 페이지 /mockups/exam-analysis-compare 전용.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const modelParam = searchParams.get('model');
  if (!modelParam || !ALLOWED_MODELS.has(modelParam)) {
    return badRequest(`허용되지 않은 모델: ${modelParam}. 허용: ${[...ALLOWED_MODELS].join(', ')}`);
  }

  const tenantWhere = await getExamScope(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

  try {
    const startMs = Date.now();

    // 파일 로드 (캐시 활용 — 같은 examPaperId 1회만 디스크 IO + base64 변환)
    const fileUrls = examPaper.fileUrls.split(',');
    const { data: imageDataList, cached: imagesCached } = await loadImagesWithCache(id, fileUrls);
    const loadMs = Date.now() - startMs;
    if (imagesCached) {
      console.log(`[analyze-compare] image cache hit (${id}) — ${loadMs}ms`);
    }

    // examPaper.examScope 추출
    const scopeRaw = examPaper.examScope as unknown;
    let examScopeArr: string[] | null = null;
    let examYear: number | null = null;
    let examSemester: number | null = null;
    let examCategory: 'MIDTERM' | 'FINAL' | 'MOCK' | 'OTHER' | null = null;
    if (Array.isArray(scopeRaw)) {
      examScopeArr = scopeRaw as string[];
    } else if (scopeRaw && typeof scopeRaw === 'object') {
      const obj = scopeRaw as Record<string, unknown>;
      if (Array.isArray(obj.topics)) examScopeArr = obj.topics as string[];
      if (typeof obj.examYear === 'number') examYear = obj.examYear;
      if (typeof obj.examSemester === 'number') examSemester = obj.examSemester;
      if (typeof obj.examCategory === 'string') {
        const cat = obj.examCategory.toUpperCase();
        if (cat === 'MIDTERM' || cat === 'FINAL' || cat === 'MOCK' || cat === 'OTHER') {
          examCategory = cat;
        }
      }
    }

    const subjectKey = toExamSubjectKey(examPaper.subject);
    const context: ExamContext = {
      subject: subjectKey,
      grade_level: examPaper.grade,
      unit: examPaper.unit,
      category: examPaper.category,
      exam_scope: examScopeArr,
      paper_type: examPaper.examType,
      has_essay: true,
      exam_year: examYear,
      exam_semester: examSemester,
      exam_category: examCategory,
    };

    const promptResult = await ExamPromptBuilder.buildWithDbContext(context);
    const promptMs = Date.now() - startMs - loadMs;

    // AI 분석 (모델 override)
    const mimeType = examPaper.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
    const aiStart = Date.now();
    // 5분 타임아웃 (Pro Preview 등 느린 모델 대응)
    const analysisResult = await Promise.race([
      analyzeExam(imageDataList, mimeType, promptResult.combined_prompt, modelParam, undefined, subjectKey),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI 분석 타임아웃 (5분 초과)')), 300_000),
      ),
    ]);
    const aiMs = Date.now() - aiStart;
    const totalMs = Date.now() - startMs;

    // ── 비용 추정 ──
    // 토큰 수 추정 (입력: 이미지 768px tile당 258 토큰 + prompt 텍스트 / 출력: 응답 텍스트)
    // 정확한 토큰 카운트는 모델별 API에서 받을 수 있지만, 비교용 추정만으로 충분.
    const promptCharCount = promptResult.combined_prompt.length;
    const estimatedInputTokens = Math.ceil(promptCharCount / 2.5) + 258 * imageDataList.length;

    // 출력 토큰: questions 배열의 직렬화 추정
    const outputJsonStr = JSON.stringify(analysisResult);
    const estimatedOutputTokens = Math.ceil(outputJsonStr.length / 2.5);

    // 모델별 가격 ($/1M tokens, 2026-05)
    const PRICING: Record<string, { input: number; output: number }> = {
      'gemini-3.1-pro-preview': { input: 2.00, output: 12.00 },
      'gemini-3.5-flash': { input: 1.50, output: 9.00 },
      'gemini-2.5-flash': { input: 0.30, output: 2.50 },
      'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
    };
    const price = PRICING[modelParam] || { input: 0, output: 0 };
    const estimatedCost =
      (estimatedInputTokens / 1_000_000) * price.input +
      (estimatedOutputTokens / 1_000_000) * price.output;

    // ── 정확도 요약 (UI용 메트릭) ──
    const questions = analysisResult.questions;
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const pointsExpected = analysisResult.exam_info.total_points || 100;
    const avgConfidence = questions.length > 0
      ? questions.reduce((sum, q) => sum + (q.confidence || 0), 0) / questions.length
      : 0;
    const unknownTopicCount = questions.filter((q) => !q.topic || /UNKNOWN/i.test(q.topic)).length;

    return NextResponse.json({
      data: {
        model: modelParam,
        timings: {
          loadMs,
          promptMs,
          aiMs,
          totalMs,
        },
        cost: {
          estimatedInputTokens,
          estimatedOutputTokens,
          estimatedUsd: Number(estimatedCost.toFixed(4)),
          pricingPer1M: price,
        },
        accuracy: {
          totalQuestions: questions.length,
          totalPoints,
          pointsExpected,
          pointsDiff: totalPoints - pointsExpected,
          avgConfidence: Number(avgConfidence.toFixed(3)),
          unknownTopicCount,
          unknownTopicPct: questions.length > 0
            ? Math.round((unknownTopicCount / questions.length) * 100)
            : 0,
        },
        summary: analysisResult.summary,
        examInfo: analysisResult.exam_info,
        questions: analysisResult.questions,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다';
    return NextResponse.json(
      { error: { code: 'COMPARE_ANALYSIS_FAILED', message: errorMsg, model: modelParam } },
      { status: 500 }
    );
  }
}
