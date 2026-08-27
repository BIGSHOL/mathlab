import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateAllChartImages, CHART_VERSION } from '@/lib/exam-analysis/chart-image-generator';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

type Params = { params: Promise<{ id: string; type: string }> };

const TYPE_MAP: Record<string, string> = {
  difficulty: 'difficulty',
  'type-radar': 'typeRadar',
  'ability-radar': 'abilityRadar',
  'combined-radar': 'combinedRadar',
  'topic-bar': 'topicBar',
  discrimination: 'discrimination',
};

// ── 동시성 락 (in-memory) ──
// 같은 분석본의 차트 생성이 동시에 여러 번 요청되면 4× 작업 + DB race condition 발생.
// analysisId 단위로 진행 중 Promise를 공유하여 단 한 번만 생성.
// Vercel Serverless 인스턴스 단위 격리 — 다른 인스턴스끼리는 별도 lock이지만,
// 같은 인스턴스 내 4개 동시 호출은 dedupe됨 (실제 케이스의 90%).
const inFlightGen = new Map<string, Promise<Record<string, string>>>();

/**
 * GET /api/exam-analysis/[id]/chart/[type] — 차트 PNG 이미지 서빙 (네이버 블로그 호환)
 *
 * Lazy 생성 (v2 2026-05-28): blog-article extension 없으면 즉시 chart-image-generator 호출하여
 * PNG 생성 + DB 저장 후 반환. V4 네이버 복사 시 사용자가 "기출 분석 글 작성" 안 눌렀어도
 * 차트(인포그래픽) 자동 포함되도록.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id, type } = await params;

  const imageKey = TYPE_MAP[type];
  if (!imageKey) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '잘못된 차트 타입입니다' } }, { status: 400 });
  }

  try {
    const latestAnalysis = await prisma.examAnalysis.findFirst({
      where: { examPaperId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        questions: true,
        summary: true,
        // 과목 — 레이더 축(수학 4능력 vs 영어 4능력) 분기용
        examPaper: { select: { subject: true } },
        extensions: {
          where: { agentType: 'blog-article' },
          select: { result: true },
        },
      },
    });

    if (!latestAnalysis) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '분석 결과가 없습니다. 기본 분석을 먼저 실행해 주세요.' } },
        { status: 404 },
      );
    }

    const articleResult = latestAnalysis.extensions[0]?.result as Record<string, unknown> | undefined;
    const savedChartVersion = articleResult?.chartVersion as string | undefined;
    let chartImages = articleResult?.chartImages as Record<string, string> | undefined;
    let base64 = chartImages?.[imageKey];

    // 강제 재생성 옵션 (?regen=1 또는 ?v=새버전)
    const url = new URL(_request.url);
    const forceRegen = url.searchParams.get('regen') === '1';

    // ── 차트 버전 mismatch면 캐시 무효화 → 신규 디자인 적용 ──
    const isStaleVersion = savedChartVersion !== CHART_VERSION;
    if (isStaleVersion || forceRegen) {
      base64 = undefined;
      chartImages = undefined;
    }

    // ── Lazy 생성: 차트 PNG가 없거나 옛 버전이면 즉시 생성 + 저장 (V4 네이버 복사 지원) ──
    if (!base64) {
      const questions = latestAnalysis.questions as unknown as AnalyzedQuestion[];
      const summary = latestAnalysis.summary as unknown as {
        difficulty_distribution: Record<string, number>;
        type_distribution: Record<string, number>;
      };

      if (!questions || !summary) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: '차트 생성에 필요한 데이터가 없습니다.' } },
          { status: 404 },
        );
      }

      // ── 동시성 dedupe ──
      // 같은 analysisId의 차트 생성이 진행 중이면 그 Promise를 await (4×병렬 호출 방어)
      const lockKey = `${latestAnalysis.id}:${CHART_VERSION}`;
      let pendingGen = inFlightGen.get(lockKey);
      if (!pendingGen) {
        pendingGen = (async () => {
          try {
            const generated = await generateAllChartImages(summary, questions, latestAnalysis.examPaper?.subject) as unknown as Record<string, string>;

            // blog-article extension 업서트 — 기존 article 데이터 보존하면서 chartImages + 버전 머지
            const existingResult = (articleResult || {}) as Record<string, unknown>;
            const mergedResult = { ...existingResult, chartImages: generated, chartVersion: CHART_VERSION };
            const now = new Date();
            await prisma.examAnalysisExtension.upsert({
              where: { analysisId_agentType: { analysisId: latestAnalysis.id, agentType: 'blog-article' } },
              create: {
                analysisId: latestAnalysis.id,
                agentType: 'blog-article',
                result: mergedResult as unknown as Prisma.InputJsonValue,
                lastRunAt: now,
              },
              update: {
                result: mergedResult as unknown as Prisma.InputJsonValue,
                lastRunAt: now,
              },
            });
            return generated;
          } finally {
            // 끝나면 lock 해제 (성공/실패 무관)
            inFlightGen.delete(lockKey);
          }
        })();
        inFlightGen.set(lockKey, pendingGen);
      }

      try {
        chartImages = await pendingGen;
      } catch (genErr) {
        console.error('[chart GET] lazy 차트 생성 실패:', genErr);
        return NextResponse.json(
          { error: { code: 'CHART_GEN_FAILED', message: '차트 이미지 생성 중 오류가 발생했습니다' } },
          { status: 500 },
        );
      }

      base64 = chartImages?.[imageKey];
      if (!base64) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: '해당 차트 타입 이미지를 생성할 수 없었습니다.' } },
          { status: 404 },
        );
      }
    }

    const buffer = Buffer.from(base64, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(buffer.length),
        // immutable 제거 — 차트 버전 bump 시 자동 갱신 가능하도록
        // 60초 fresh + 1일 stale-while-revalidate (네이버 블로그 트래픽엔 충분)
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=86400',
        'X-Chart-Version': CHART_VERSION,
      },
    });
  } catch (error) {
    console.error('[exam-analysis chart GET] 차트 이미지 조회 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '차트 이미지를 불러오는 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
