import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { AuthUser } from './auth';
import { hasLicense, toEnum, type LicenseFeatureKey } from '@/lib/services/license';

/**
 * API 라우트에서 학생의 이용권을 확인하는 가드.
 * - STUDENT가 아닌 역할은 항상 통과 (null 반환)
 * - 이용권 없으면 403 반환
 *
 * 사용법:
 * ```ts
 * const licenseCheck = await requireLicense(user, 'arithmetic');
 * if (licenseCheck) return licenseCheck;
 * ```
 */
export async function requireLicense(
  user: AuthUser,
  feature: LicenseFeatureKey
): Promise<NextResponse | null> {
  // 선생님/원장/슈퍼어드민은 항상 통과
  if (user.role !== 'STUDENT') return null;

  const licensed = await hasLicense(user.id, feature);
  if (!licensed) {
    return NextResponse.json(
      { error: { code: 'LICENSE_REQUIRED', message: '이용권이 필요합니다' } },
      { status: 403 }
    );
  }

  return null;
}

/**
 * 선생님 도구(워크북·기출분석·학습지 등)용 가드.
 * 지점(Tenant)에 활성 이용권이 있는지 확인한다.
 *
 * - SUPER_ADMIN: 항상 통과
 * - STUDENT: 항상 차단 (선생님 전용 도구이므로)
 * - 그 외(TEACHER/MANAGER/OWNER): View-As 우선 tenantId 기준으로 TenantLicense.isActive 확인
 *
 * 사용법:
 * ```ts
 * const tenantCheck = await requireTenantFeature(user, 'workbook');
 * if (tenantCheck) return tenantCheck;
 * ```
 */
export async function requireTenantFeature(
  user: AuthUser,
  feature: LicenseFeatureKey
): Promise<NextResponse | null> {
  if (user.role === 'SUPER_ADMIN') return null;
  if (user.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '선생님 전용 기능입니다' } },
      { status: 403 }
    );
  }

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: { code: 'TENANT_REQUIRED', message: '소속 지점이 없습니다' } },
      { status: 403 }
    );
  }

  const license = await prisma.tenantLicense.findFirst({
    where: { tenantId, feature: toEnum(feature), isActive: true },
    select: { expiresAt: true },
  });
  if (!license) {
    return NextResponse.json(
      { error: { code: 'TENANT_LICENSE_REQUIRED', message: '지점에 이용권이 없습니다' } },
      { status: 403 }
    );
  }
  if (license.expiresAt && license.expiresAt < new Date()) {
    return NextResponse.json(
      { error: { code: 'TENANT_LICENSE_EXPIRED', message: '지점 이용권이 만료되었습니다' } },
      { status: 403 }
    );
  }

  return null;
}
