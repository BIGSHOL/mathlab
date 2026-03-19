import { headers } from 'next/headers';
import { prisma } from './db';
import { getCurrentUser } from './auth';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  settings: Record<string, unknown> | null;
}

/** 미들웨어가 주입한 x-tenant-slug 헤더에서 현재 테넌트 조회 */
export async function resolveCurrentTenant(): Promise<TenantInfo | null> {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug');
  if (!slug) return null; // 메인 도메인

  const tenant = await prisma.tenant.findUnique({
    where: { slug, isActive: true },
    select: { id: true, slug: true, name: true, logo: true, settings: true },
  });

  return tenant as TenantInfo | null;
}

/** 세션에서 현재 사용자의 tenantId 반환 */
export async function getCurrentTenantId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.tenantId ?? null;
}
