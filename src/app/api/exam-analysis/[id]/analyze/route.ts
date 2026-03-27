import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, notFound, badRequest } from '@/lib/api';
import { analyzeExam } from '@/lib/exam-analysis/ai-engine';
import { ExamPromptBuilder } from '@/lib/exam-analysis/prompt-builder';
import { detectGradingMarks } from '@/lib/exam-analysis/mark-detector';
import { crossValidateGrading, consolidateDominantTopic } from '@/lib/exam-analysis/cross-validator';
import type { ExamContext, AnalyzedQuestion } from '@/lib/exam-analysis/types';
import path from 'path';
import { readFile } from 'fs/promises';

type Params = { params: Promise<{ id: string }> };

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

  // 이미 분석 중이면 거절
  if (examPaper.status === 'ANALYZING') {
    return badRequest('이미 분석이 진행 중입니다');
  }

  // 상태 → ANALYZING
  await prisma.examPaper.update({
    where: { id },
    data: { status: 'ANALYZING', errorMessage: null },
  });

  try {
    // 파일 로드 (base64)
    const fileUrls = examPaper.fileUrls.split(',');
    const imageDataList: string[] = [];

    for (const fileUrl of fileUrls) {
      const filePath = path.join(process.cwd(), 'public', fileUrl);
      const buffer = await readFile(filePath);
      imageDataList.push(buffer.toString('base64'));
    }

    // 프롬프트 빌드
    const context: ExamContext = {
      subject: examPaper.subject === 'MATH' ? '수학' : '영어',
      grade_level: examPaper.grade,
      unit: examPaper.unit,
      category: examPaper.category,
      exam_scope: examPaper.examScope as string[] | null,
      paper_type: examPaper.examType,
      has_essay: true, // 기본적으로 서술형 가이드 포함
    };

    const promptResult = await ExamPromptBuilder.buildWithDbContext(context);

    // Gemini Vision 분석 호출
    const mimeType = examPaper.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
    const analysisResult = await analyzeExam(imageDataList, mimeType, promptResult.combined_prompt);

    let questions = analysisResult.questions as AnalyzedQuestion[];

    // 학생 답안지: 채점 마크 감지 + 교차 검증
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

    // 내신 원칙: 60% 이상 같은 과목이면 통합
    questions = consolidateDominantTopic(questions);

    // 통계 계산
    const totalQuestions = questions.length;
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const earnedPoints = questions.reduce((sum, q) => sum + (q.earned_points || 0), 0);

    // DB 저장
    const analysis = await prisma.examAnalysis.create({
      data: {
        examPaperId: id,
        questions: questions as unknown as Record<string, unknown>[],
        summary: analysisResult.summary || null,
        markDetection: markDetection as unknown as Record<string, unknown> | null,
        crossValidation: crossValidation as unknown as Record<string, unknown> | null,
        modelVersion: 'gemini-2.5-flash',
        totalQuestions,
        totalPoints: totalPoints || null,
        earnedPoints: earnedPoints || null,
        analyzedAt: new Date(),
      },
    });

    // 상태 → COMPLETED
    await prisma.examPaper.update({
      where: { id },
      data: { status: 'COMPLETED' },
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
    // 상태 → FAILED
    const errorMsg = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다';
    await prisma.examPaper.update({
      where: { id },
      data: { status: 'FAILED', errorMessage: errorMsg },
    });

    return NextResponse.json(
      { error: { code: 'ANALYSIS_FAILED', message: errorMsg } },
      { status: 500 }
    );
  }
}
