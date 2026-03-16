import { NextResponse } from 'next/server';
import { getFeatureFlags, seedFeatureFlags } from '@/lib/utils/features';

/** GET /api/features — 공개 Feature Flag 맵 */
export async function GET() {
  // 시드 보장 (최초 1회)
  await seedFeatureFlags();
  const flags = await getFeatureFlags();
  return NextResponse.json({ data: flags });
}
