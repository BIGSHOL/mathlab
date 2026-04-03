import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string; type: string }> };

const TYPE_MAP: Record<string, string> = {
  difficulty: 'difficulty',
  'type-radar': 'typeRadar',
  'topic-bar': 'topicBar',
};

/** GET /api/exam-analysis/[id]/chart/[type] — 차트 PNG 이미지 서빙 (네이버 블로그 호환) */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id, type } = await params;

  const imageKey = TYPE_MAP[type];
  if (!imageKey) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '잘못된 차트 타입' } }, { status: 400 });
  }

  // 최신 분석의 blog-article extension에서 chartImages 조회
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
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '차트 이미지를 찾을 수 없습니다' } }, { status: 404 });
  }

  const buffer = Buffer.from(base64, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
