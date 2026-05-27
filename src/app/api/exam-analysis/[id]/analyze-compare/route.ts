import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, notFound, badRequest } from '@/lib/api';
import { analyzeExam } from '@/lib/exam-analysis/ai-engine';
import { ExamPromptBuilder } from '@/lib/exam-analysis/prompt-builder';
import type { ExamContext } from '@/lib/exam-analysis/types';
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

  const tenantWhere = getTenantFilter(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

  try {
    const startMs = Date.now();

    // 파일 로드
    const fileUrls = examPaper.fileUrls.split(',');
    const imageDataList: string[] = [];
    for (const fileUrl of fileUrls) {
      imageDataList.push(await loadFileAsBase64(fileUrl));
    }
    const loadMs = Date.now() - startMs;

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

    const context: ExamContext = {
      subject: examPaper.subject === 'MATH' ? '수학' : '영어',
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
      analyzeExam(imageDataList, mimeType, promptResult.combined_prompt, modelParam),
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
