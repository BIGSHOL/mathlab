import { NextRequest, NextResponse } from 'next/server';
import { processPendingSchedules } from '@/lib/services/exam-extract-batch';
import { cleanupNaverSections, NAVER_SECTION_TTL_MS } from '@/lib/services/naver-section-cleanup';

export const maxDuration = 300; // 최대 5분 (Vercel Pro)

/**
 * Vercel Cron에서 5분마다 호출.
 * PENDING 상태 + scheduledAt 도래한 스케줄을 실행.
 *
 * 인증: Vercel Cron은 `Authorization: Bearer $CRON_SECRET` 헤더 자동 주입.
 * 수동 호출 시 동일 헤더 필요.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: { code: 'CONFIG', message: 'CRON_SECRET 미설정' } },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '인증 실패' } },
      { status: 401 },
    );
  }

  try {
    const result = await processPendingSchedules();

    // 네이버 섹션 캡처 이미지 3일 TTL 정리 (실패해도 배치 결과에는 영향 없도록 격리)
    let naverCleanup: { folders: number; scanned: number; deleted: number } | null = null;
    try {
      naverCleanup = await cleanupNaverSections(NAVER_SECTION_TTL_MS, Date.now());
    } catch (e) {
      console.error('[cron/extract-batch-tick] naver-sections 정리 실패:', e);
    }

    return NextResponse.json({
      data: {
        processed: result.processed,
        total: result.results.length,
        success: result.results.filter((r) => r.success).length,
        failed: result.results.filter((r) => !r.success).length,
        naverCleanup,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '배치 실행 실패';
    console.error('[cron/extract-batch-tick] 실패:', error);
    return NextResponse.json(
      { error: { code: 'BATCH_FAILED', message } },
      { status: 500 },
    );
  }
}
