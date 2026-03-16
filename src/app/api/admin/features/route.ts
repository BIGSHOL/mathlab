import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, isResponse } from '@/lib/api';
import { seedFeatureFlags } from '@/lib/utils/features';

/** GET /api/admin/features — 전체 Feature Flag 목록 */
export async function GET() {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  await seedFeatureFlags();
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json({ data: flags });
}
