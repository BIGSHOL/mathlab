import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, notFound, badRequest } from '@/lib/api';
import { generateExamArticleStream } from '@/lib/exam-analysis/article-generator';
import { generateAllChartImages } from '@/lib/exam-analysis/chart-image-generator';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

type Params = { params: Promise<{ id: string }> };

/** POST /api/exam-analysis/[id]/generate-article — 기출 분석 블로그 글 생성 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  const tenantWhere = getTenantFilter(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

  // 최신 분석 결과 + commentary extension 조회
  const latestAnalysis = await prisma.examAnalysis.findFirst({
    where: { examPaperId: id },
    orderBy: { createdAt: 'desc' },
    include: { extensions: true },
  });
  if (!latestAnalysis) return badRequest('기본 분석을 먼저 실행하세요');

  const commentaryExt = latestAnalysis.extensions.find(
    (e) => e.agentType === 'commentary',
  );
  if (!commentaryExt?.result) {
    return badRequest('AI 총평을 먼저 생성하세요');
  }

  const commentary = commentaryExt.result as unknown as CommentaryResult;
  const questions = latestAnalysis.questions as unknown as AnalyzedQuestion[];
  const summary = latestAnalysis.summary as unknown as {
    difficulty_distribution: Record<string, number>;
    type_distribution: Record<string, number>;
  };

  // NDJSON 스트리밍 응답
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      try {
        // Step 1: 차트 이미지 생성
        send({ type: 'progress', step: 1, totalSteps: 3, message: '차트 이미지 생성 중...' });
        const chartImages = await generateAllChartImages(summary, questions);
        send({ type: 'progress', step: 1, totalSteps: 3, message: '차트 이미지 3종 생성 완료' });

        // Step 2: AI 글 생성 (스트리밍)
        send({ type: 'progress', step: 2, totalSteps: 3, message: 'AI가 블로그 글을 작성하고 있습니다...' });

        const article = await generateExamArticleStream(
          {
            examPaper: {
              title: examPaper.title,
              schoolName: examPaper.schoolName,
              grade: examPaper.grade,
              category: examPaper.category,
              unit: examPaper.unit,
              examScope: examPaper.examScope as string[] | null,
            },
            analysis: {
              questions,
              summary,
              totalQuestions: latestAnalysis.totalQuestions ?? questions.length,
              totalPoints: latestAnalysis.totalPoints ?? 100,
            },
            commentary,
          },
          (delta) => {
            send({ type: 'stream', delta });
          },
        );

        // Step 3: 후처리 + 저장
        send({ type: 'progress', step: 3, totalSteps: 3, message: '글 저장 중...' });

        // {{CHART:*}} 토큰 → API URL <img> 태그 변환
        // 네이버 블로그는 base64 data URI 차단 → API 라우트로 실제 PNG 서빙
        // NEXTAUTH_URL이 localhost일 수 있으므로 request에서 실제 origin 추출
        const reqUrl = new URL(request.url);
        const forwardedProto = request.headers.get('x-forwarded-proto');
        let baseUrl = forwardedProto
          ? `${forwardedProto}://${request.headers.get('host')}`
          : reqUrl.origin;
        // localhost → 프로덕션 도메인으로 강제 교체 (Mixed Content 방지)
        if (baseUrl.includes('localhost')) {
          baseUrl = 'https://mathlab-mu.vercel.app';
        }
        const totalQ = latestAnalysis.totalQuestions ?? questions.length;

        const chartTokenMap: Record<string, { url: string; alt: string; caption: string }> = {
          '{{CHART:difficulty}}': {
            url: `${baseUrl}/api/exam-analysis/${id}/chart/difficulty`,
            alt: '난이도 분포',
            caption: `▲ ${totalQ}문항 난이도 분포`,
          },
          '{{CHART:type_radar}}': {
            url: `${baseUrl}/api/exam-analysis/${id}/chart/type-radar`,
            alt: '출제 영역 분포',
            caption: '▲ 교육과정 영역별 출제 비중',
          },
          '{{CHART:ability_radar}}': {
            url: `${baseUrl}/api/exam-analysis/${id}/chart/ability-radar`,
            alt: '능력 영역 분포',
            caption: '▲ 수학 능력 영역별 분포',
          },
          '{{CHART:combined_radar}}': {
            url: `${baseUrl}/api/exam-analysis/${id}/chart/combined-radar`,
            alt: '출제 영역 및 능력 영역 분포',
            caption: '▲ 출제 영역(좌) · 능력 영역(우) 분포',
          },
          '{{CHART:topic_bar}}': {
            url: `${baseUrl}/api/exam-analysis/${id}/chart/topic-bar`,
            alt: '단원별 출제 현황',
            caption: '▲ 단원별 문항 수 및 배점',
          },
        };

        let htmlContent = article.content;
        for (const [token, chart] of Object.entries(chartTokenMap)) {
          htmlContent = htmlContent.replace(
            token,
            `<img src="${chart.url}" alt="${chart.alt}" style="max-width: 100%; height: auto;" /><p style="text-align: center; color: #64748B; font-size: 13px;">${chart.caption}</p>`,
          );
        }

        const resultData = {
          title: article.title,
          content: htmlContent,
          tags: article.tags,
          metaDescription: article.metaDescription,
          chartImages,
          generatedAt: article.generatedAt,
        };

        // DB 저장
        await prisma.examAnalysisExtension.upsert({
          where: {
            analysisId_agentType: {
              analysisId: latestAnalysis.id,
              agentType: 'blog-article',
            },
          },
          create: {
            analysisId: latestAnalysis.id,
            agentType: 'blog-article',
            result: resultData as unknown as Prisma.InputJsonValue,
          },
          update: {
            result: resultData as unknown as Prisma.InputJsonValue,
            errorMessage: null,
          },
        });

        send({ type: 'result', ...resultData });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '블로그 글 생성에 실패했습니다';
        console.error('[generate-article] 오류:', error);
        send({ type: 'error', error: errorMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}

/** GET /api/exam-analysis/[id]/generate-article — 저장된 글 조회 */
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  try {
    const tenantWhere = getTenantFilter(user);
    const examPaper = await prisma.examPaper.findFirst({
      where: { id, ...tenantWhere },
    });
    if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

    const latestAnalysis = await prisma.examAnalysis.findFirst({
      where: { examPaperId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (!latestAnalysis) return NextResponse.json({ data: null });

    const articleExt = await prisma.examAnalysisExtension.findUnique({
      where: {
        analysisId_agentType: {
          analysisId: latestAnalysis.id,
          agentType: 'blog-article',
        },
      },
    });

    return NextResponse.json({ data: articleExt?.result ?? null });
  } catch (error) {
    console.error('[generate-article GET] 저장된 글 조회 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '저장된 블로그 글을 불러오는 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}

/** PUT /api/exam-analysis/[id]/generate-article — 수정된 글 저장 */
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  try {
    const tenantWhere = getTenantFilter(user);
    const examPaper = await prisma.examPaper.findFirst({
      where: { id, ...tenantWhere },
    });
    if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

    const latestAnalysis = await prisma.examAnalysis.findFirst({
      where: { examPaperId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (!latestAnalysis) return badRequest('분석 결과가 없습니다');

    const body = await request.json();
    const { content, title, tags } = body;

    const existing = await prisma.examAnalysisExtension.findUnique({
      where: {
        analysisId_agentType: {
          analysisId: latestAnalysis.id,
          agentType: 'blog-article',
        },
      },
    });
    if (!existing) return notFound('저장된 글이 없습니다');

    // 기존 데이터에 수정 내용 병합
    const existingResult = existing.result as Record<string, unknown>;
    const updatedResult = {
      ...existingResult,
      ...(content !== undefined && { content }),
      ...(title !== undefined && { title }),
      ...(tags !== undefined && { tags }),
      updatedAt: new Date().toISOString(),
    };

    await prisma.examAnalysisExtension.update({
      where: {
        analysisId_agentType: {
          analysisId: latestAnalysis.id,
          agentType: 'blog-article',
        },
      },
      data: { result: updatedResult as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('[generate-article PUT] 글 저장 에러:', error);
    return NextResponse.json(
      { error: { code: 'SAVE_FAILED', message: '블로그 글 저장 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
