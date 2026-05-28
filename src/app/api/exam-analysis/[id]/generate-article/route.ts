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

  // 학원/강사/지점특색 변수 (선택 입력, body가 비어도 OK)
  let variables: { academyName?: string; teacherName?: string; branchTag?: string } = {};
  try {
    const body = await request.json();
    if (body && typeof body === 'object') {
      const trim = (v: unknown) =>
        typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
      variables = {
        academyName: trim(body.academyName),
        teacherName: trim(body.teacherName),
        branchTag: trim(body.branchTag),
      };
    }
  } catch {
    // 빈 body는 OK — 변수 없이 생성 (CTA는 단순 마무리로 degrade)
  }

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

      // baseUrl 계산 — 차트 URL을 스트림 중에도 보내기 위해 try 전에 미리 산출
      const reqUrl = new URL(request.url);
      const forwardedProto = request.headers.get('x-forwarded-proto');
      let baseUrl = forwardedProto
        ? `${forwardedProto}://${request.headers.get('host')}`
        : reqUrl.origin;
      if (baseUrl.includes('localhost')) {
        baseUrl = 'https://mathlab-mu.vercel.app';
      }

      try {
        // Step 1: 차트 이미지 생성
        send({ type: 'progress', step: 1, totalSteps: 3, message: '차트 이미지 생성 중...' });
        const chartImages = await generateAllChartImages(summary, questions);
        send({ type: 'progress', step: 1, totalSteps: 3, message: '차트 이미지 3종 생성 완료' });

        // 스트림 중 토큰 치환용 차트 URL 사전 송신 (클라이언트는 placeholder → 실제 <img>로 자연스러운 전환)
        // ?v=v2 — 차트 디자인 업그레이드 강제 적용 (browser/CDN 캐시 우회)
        send({
          type: 'chart-urls',
          urls: {
            difficulty: `${baseUrl}/api/exam-analysis/${id}/chart/difficulty?v=v2`,
            ability_radar: `${baseUrl}/api/exam-analysis/${id}/chart/ability-radar?v=v2`,
            topic_bar: `${baseUrl}/api/exam-analysis/${id}/chart/topic-bar?v=v2`,
            discrimination: `${baseUrl}/api/exam-analysis/${id}/chart/discrimination?v=v2`,
          },
        });

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
              examScope: examPaper.examScope,
            },
            analysis: {
              questions,
              summary,
              totalQuestions: latestAnalysis.totalQuestions ?? questions.length,
              totalPoints: latestAnalysis.totalPoints ?? 100,
            },
            commentary,
          },
          {
            onDelta: (delta) => send({ type: 'stream', delta }),
            // archetype/모듈 정보 — 스트림 시작 직후 클라이언트로 송신
            onBlueprint: (info) => send({ type: 'blueprint-info', info }),
          },
          variables,
        );

        // Step 3: 후처리 + 저장
        send({ type: 'progress', step: 3, totalSteps: 3, message: '글 저장 중...' });

        // {{CHART:*}} 토큰 → API URL <img> 태그 변환 (baseUrl은 try 진입 전 계산됨)
        // 네이버 블로그는 base64 data URI 차단 → API 라우트로 실제 PNG 서빙
        const totalQ = latestAnalysis.totalQuestions ?? questions.length;

        // 블로그 글은 분석 화면과 동일하게 난이도 + 능력 영역 + 단원별 + 변별력 네 차트 사용.
        // type_radar/combined_radar는 옛 글에 남아있을 수 있어 폐지 토큰으로 흔적 없이 제거.
        // ?v=v2 — 차트 디자인 업그레이드 강제 적용 (네이버 블로그 게시물에도 동일하게 적용)
        const chartTokenMap: Record<string, { url: string; alt: string; caption: string }> = {
          '{{CHART:difficulty}}': {
            url: `${baseUrl}/api/exam-analysis/${id}/chart/difficulty?v=v2`,
            alt: '난이도 분포',
            caption: `▲ ${totalQ}문항 난이도 분포`,
          },
          '{{CHART:ability_radar}}': {
            url: `${baseUrl}/api/exam-analysis/${id}/chart/ability-radar?v=v2`,
            alt: '능력 영역 분포',
            caption: '▲ 수학 능력 영역별 분포',
          },
          '{{CHART:topic_bar}}': {
            url: `${baseUrl}/api/exam-analysis/${id}/chart/topic-bar?v=v2`,
            alt: '단원별 출제 현황',
            caption: '▲ 단원별 문항 수 및 배점',
          },
          '{{CHART:discrimination}}': {
            url: `${baseUrl}/api/exam-analysis/${id}/chart/discrimination?v=v2`,
            alt: '변별력 분석',
            caption: '▲ 평균 변별력 지수 + 등급별 문항 분포',
          },
        };

        // 폐지된 토큰 — AI가 출력해도 흔적 없이 제거 (type_radar/combined_radar 한정)
        const RETIRED_CHART_TOKENS = ['{{CHART:type_radar}}', '{{CHART:combined_radar}}'];

        let htmlContent = article.content;
        for (const [token, chart] of Object.entries(chartTokenMap)) {
          htmlContent = htmlContent.split(token).join(
            `<img src="${chart.url}" alt="${chart.alt}" style="max-width: 100%; height: auto;" /><p style="text-align: center; color: #64748B; font-size: 13px;">${chart.caption}</p>`,
          );
        }
        for (const token of RETIRED_CHART_TOKENS) {
          htmlContent = htmlContent.split(token).join('');
        }

        const resultData = {
          title: article.title,
          content: htmlContent,
          tags: article.tags,
          metaDescription: article.metaDescription,
          chartImages,
          generatedAt: article.generatedAt,
          // ── 신규 (Hybrid Archetype × Composition) ──
          archetype: article.archetype,
          blueprintInfo: article.blueprintInfo,
          antiPatternWarnings: article.antiPatternWarnings,
        };

        // DB 저장 (블로그 글 마지막 생성자 추적)
        const now = new Date();
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
            lastRunBy: user.id,
            lastRunAt: now,
          },
          update: {
            result: resultData as unknown as Prisma.InputJsonValue,
            errorMessage: null,
            lastRunBy: user.id,
            lastRunAt: now,
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
