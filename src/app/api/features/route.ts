import { NextResponse } from 'next/server';
import { getFeatureFlags, seedFeatureFlags } from '@/lib/utils/features';
import { requireAuth, isResponse } from '@/lib/api';

/** GET /api/features — 공개 Feature Flag 맵 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;
  // 시드 보장 (최초 1회)
  await seedFeatureFlags();
  const flags = await getFeatureFlags(user.tenantId);
  return NextResponse.json({ data: flags });
}
