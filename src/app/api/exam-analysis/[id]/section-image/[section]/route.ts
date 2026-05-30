import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  renderSectionImage,
  RENDERABLE_SECTION_KEYS,
  SECTION_IMAGE_VERSION,
  type SectionMeta,
} from '@/lib/exam-analysis/section-image-generator';
import { sumPoints } from '@/lib/exam-analysis/points';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

type Params = { params: Promise<{ id: string; section: string }> };

/**
 * GET /api/exam-analysis/[id]/section-image/[section] — V3 총평 "섹션 이미지" PNG 서빙 (네이버 복사용)
 *
 * ⚠️ 무인증(공개) — 네이버 서버가 이미지를 가져갈 때 비인증이므로 auth 걸면 401로 못 불러옴.
 *    차트 엔드포인트(/chart/[type])와 동일 정책. 렌더 내용은 블로그 공개용이라 민감정보 아님.
 * 차트 엔드포인트와 동일 패턴: lazy 생성 + DB 캐시(extension 'section-images') + 버전 무효화 + in-flight dedup.
 */
const inFlight = new Map<string, Promise<string | null>>();

export async function GET(req: NextRequest, { params }: Params) {
  const { id, section } = await params;

  if (!RENDERABLE_SECTION_KEYS.includes(section)) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '지원하지 않는 섹션입니다' } }, { status: 400 });
  }

  try {
    const examPaper = await prisma.examPaper.findFirst({
      where: { id },
      select: { id: true, title: true, grade: true, schoolName: true },
    });
    if (!examPaper) return NextResponse.json({ error: { code: 'NOT_FOUND', message: '시험지 없음' } }, { status: 404 });

    const analysis = await prisma.examAnalysis.findFirst({
      where: { examPaperId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        questions: true,
        extensions: { where: { agentType: { in: ['commentary', 'section-images'] } }, select: { agentType: true, result: true } },
      },
    });
    if (!analysis) return NextResponse.json({ error: { code: 'NOT_FOUND', message: '분석 없음' } }, { status: 404 });

    const commentary = (analysis.extensions.find((e) => e.agentType === 'commentary')?.result ?? {}) as Record<string, unknown>;
    const cacheExt = analysis.extensions.find((e) => e.agentType === 'section-images')?.result as
      | { images?: Record<string, string>; version?: string }
      | undefined;

    const url = new URL(req.url);
    const forceRegen = url.searchParams.get('regen') === '1';
    const cacheValid = cacheExt?.version === SECTION_IMAGE_VERSION && !forceRegen;
    let base64 = cacheValid ? cacheExt?.images?.[section] : undefined;

    if (!base64) {
      const questions = (analysis.questions ?? []) as unknown as AnalyzedQuestion[];
      const total = questions.length || 1;
      const diffCounts = [1, 2, 3, 4, 5].map((lv) => questions.filter((q) => String(q.difficulty) === String(lv)).length);
      const weighted = diffCounts.reduce((acc, n, i) => acc + n * (i + 1), 0) / total;
      const meta: SectionMeta = {
        examTitle: examPaper.title,
        grade: examPaper.grade,
        schoolName: examPaper.schoolName,
        totalQuestions: questions.length,
        totalPoints: sumPoints(questions.map((q) => q.points)),
      };
      const kpi = {
        avgDifficulty: weighted.toFixed(1),
        killerPct: Math.round((questions.filter((q) => ['4', '5'].includes(String(q.difficulty))).length / total) * 100),
        essayCount: questions.filter((q) => q.question_format === 'essay').length,
      };

      const lockKey = `${analysis.id}:${SECTION_IMAGE_VERSION}:${section}`;
      let pending = inFlight.get(lockKey);
      if (!pending) {
        pending = (async () => {
          try {
            const png = await renderSectionImage(section, commentary, meta, kpi);
            if (!png) return null;
            const b64 = png.toString('base64');
            // 캐시 머지 (버전 불일치면 교체)
            const prevImages = cacheExt?.version === SECTION_IMAGE_VERSION ? (cacheExt?.images ?? {}) : {};
            const merged = { images: { ...prevImages, [section]: b64 }, version: SECTION_IMAGE_VERSION };
            const now = new Date();
            await prisma.examAnalysisExtension.upsert({
              where: { analysisId_agentType: { analysisId: analysis.id, agentType: 'section-images' } },
              create: { analysisId: analysis.id, agentType: 'section-images', result: merged as unknown as Prisma.InputJsonValue, lastRunAt: now },
              update: { result: merged as unknown as Prisma.InputJsonValue, lastRunAt: now },
            });
            return b64;
          } finally {
            inFlight.delete(lockKey);
          }
        })();
        inFlight.set(lockKey, pending);
      }
      base64 = (await pending) ?? undefined;
      if (!base64) {
        return NextResponse.json({ error: { code: 'GEN_FAILED', message: '섹션 이미지 생성 실패' } }, { status: 500 });
      }
    }

    const body = new Uint8Array(Buffer.from(base64, 'base64'));
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(body.length),
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=86400',
        'X-Section-Version': SECTION_IMAGE_VERSION,
      },
    });
  } catch (error) {
    console.error('[section-image GET] 에러:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: '섹션 이미지 조회 오류' } }, { status: 500 });
  }
}
