import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string; type: string }> };

const TYPE_MAP: Record<string, string> = {
  difficulty: 'difficulty',
  'type-radar': 'typeRadar',
  'ability-radar': 'abilityRadar',
  'topic-bar': 'topicBar',
};

/** GET /api/exam-analysis/[id]/chart/[type] — 차트 PNG 이미지 서빙 (네이버 블로그 호환) */
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
        extensions: {
          where: { agentType: 'blog-article' },
          select: { result: true },
        },
      },
    });

    const articleResult = latestAnalysis?.extensions[0]?.result as Record<string, unknown> | undefined;
    const chartImages = articleResult?.chartImages as Record<string, string> | undefined;
    const base64 = chartImages?.[imageKey];

    if (!base64) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '차트 이미지를 찾을 수 없습니다. 블로그 글을 먼저 생성해 주세요.' } },
        { status: 404 },
      );
    }

    const buffer = Buffer.from(base64, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
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
