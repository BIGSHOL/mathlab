import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, notFound, badRequest } from '@/lib/api';
import { analyzeExam } from '@/lib/exam-analysis/ai-engine';
import { ExamPromptBuilder } from '@/lib/exam-analysis/prompt-builder';
import { detectGradingMarks } from '@/lib/exam-analysis/mark-detector';
import { crossValidateGrading, consolidateDominantTopic } from '@/lib/exam-analysis/cross-validator';
import type { ExamContext, AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { PROMPT_VERSION } from '@/lib/exam-analysis/constants';
import { matchSchoolByName } from '@/lib/utils/school-matcher';
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
  // 로컬 파일
  const filePath = path.join(process.cwd(), 'public', fileUrl);
  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

type Params = { params: Promise<{ id: string }> };

/** 분석 단계 업데이트 헬퍼 */
async function setStep(id: string, step: number) {
  await prisma.examPaper.update({
    where: { id },
    data: { analysisStep: step },
  });
}

/** POST /api/exam-analysis/[id]/analyze — 기본 분석 실행 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  const tenantWhere = getTenantFilter(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

  if (examPaper.status === 'ANALYZING') {
    // 2분 이상 ANALYZING 상태면 갇힌 것으로 판단 → 재시도 허용
    const stuckMinutes = (Date.now() - new Date(examPaper.updatedAt).getTime()) / 60000;
    if (stuckMinutes < 2) {
      return badRequest('이미 분석이 진행 중입니다');
    }
  }

  // 재분석 시 기존 분석 결과 삭제 → 처음부터 다시
  if (examPaper.status === 'COMPLETED' || examPaper.status === 'FAILED') {
    await prisma.examAnalysis.deleteMany({ where: { examPaperId: id } });
  }

  // 상태 → ANALYZING, step 0
  await prisma.examPaper.update({
    where: { id },
    data: { status: 'ANALYZING', analysisStep: 0, errorMessage: null },
  });

  try {
    // ── Step 1: 파일 로드 ──
    await setStep(id, 1);

    const fileUrls = examPaper.fileUrls.split(',');
    const imageDataList: string[] = [];

    for (const fileUrl of fileUrls) {
      imageDataList.push(await loadFileAsBase64(fileUrl));
    }

    // ── Step 2: 분류 + 프롬프트 구성 ──
    await setStep(id, 2);

    const context: ExamContext = {
      subject: examPaper.subject === 'MATH' ? '수학' : '영어',
      grade_level: examPaper.grade,
      unit: examPaper.unit,
      category: examPaper.category,
      exam_scope: examPaper.examScope as string[] | null,
      paper_type: examPaper.examType,
      has_essay: true,
    };

    const promptResult = await ExamPromptBuilder.buildWithDbContext(context);

    // ── Step 3: AI 문항 분석 (가장 오래 걸림) ──
    await setStep(id, 3);

    const mimeType = examPaper.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
    // 3분 타임아웃 — Gemini 응답이 없으면 강제 중단
    const analysisResult = await Promise.race([
      analyzeExam(imageDataList, mimeType, promptResult.combined_prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI 분석 타임아웃 (3분 초과)')), 180_000),
      ),
    ]);

    let questions = analysisResult.questions as AnalyzedQuestion[];

    // 채점 마크 감지 + 교차 검증 (학생 답안지)
    let markDetection = null;
    let crossValidation = null;

    if (examPaper.examType === 'student' && imageDataList.length > 0) {
      try {
        markDetection = await detectGradingMarks(imageDataList[0], mimeType);
        if (markDetection && markDetection.marks.length > 0) {
          crossValidation = crossValidateGrading(questions, markDetection);
        }
      } catch (e) {
        console.error('[기출분석] 채점 마크 감지 실패:', e);
      }
    }

    // 내신 원칙 통합
    questions = consolidateDominantTopic(questions);

    // ── 2단계 학교 매칭: schoolId 없고 AI가 학교명 추출했으면 자동 매칭 ──
    if (!examPaper.schoolId && analysisResult.exam_info.school_name) {
      try {
        const aiSchoolName = analysisResult.exam_info.school_name;
        const matchedId = await matchSchoolByName(aiSchoolName, examPaper.grade);
        const updateData: Record<string, unknown> = {};
        if (!examPaper.schoolName) updateData.schoolName = aiSchoolName;
        if (matchedId) updateData.schoolId = matchedId;
        if (Object.keys(updateData).length > 0) {
          await prisma.examPaper.update({ where: { id }, data: updateData });
        }
      } catch { /* 매칭 실패해도 분석은 계속 */ }
    }

    // ── Step 4: DB 저장 (Gemini 호출 후 DB 연결 재확인) ──
    // PgBouncer 유휴 연결 끊김 방지: 간단한 쿼리로 커넥션 활성화
    await prisma.$executeRaw`SELECT 1`;
    await setStep(id, 4);

    const totalQuestions = questions.length;
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const earnedPoints = questions.reduce((sum, q) => sum + (q.earned_points || 0), 0);

    const analysis = await prisma.examAnalysis.create({
      data: {
        examPaperId: id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions: JSON.parse(JSON.stringify(questions)) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        summary: analysisResult.summary ? JSON.parse(JSON.stringify(analysisResult.summary)) as any : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        markDetection: markDetection ? JSON.parse(JSON.stringify(markDetection)) as any : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        crossValidation: crossValidation ? JSON.parse(JSON.stringify(crossValidation)) as any : null,
        modelVersion: `gemini-2.5-flash / prompt ${PROMPT_VERSION}`,
        totalQuestions,
        totalPoints: totalPoints || null,
        earnedPoints: earnedPoints || null,
        analyzedAt: new Date(),
      },
    });

    // 저신뢰/고난도 문항 레퍼런스 자동 수집
    try {
      const { collectLowConfidenceReferences } = await import('@/lib/exam-analysis/reference-collector');
      await collectLowConfidenceReferences(id, analysis.id, questions);
    } catch (e) {
      console.error('[기출분석] 레퍼런스 자동수집 실패:', e);
    }

    // ── 완료 ──
    await prisma.examPaper.update({
      where: { id },
      data: { status: 'COMPLETED', analysisStep: 4 },
    });

    return NextResponse.json({
      data: {
        analysisId: analysis.id,
        status: 'COMPLETED',
        totalQuestions,
        totalPoints,
        earnedPoints,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다';
    await prisma.examPaper.update({
      where: { id },
      data: { status: 'FAILED', errorMessage: errorMsg, analysisStep: 0 },
    });

    return NextResponse.json(
      { error: { code: 'ANALYSIS_FAILED', message: errorMsg } },
      { status: 500 }
    );
  }
}
