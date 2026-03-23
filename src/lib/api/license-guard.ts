import { NextResponse } from 'next/server';
import type { AuthUser } from './auth';
import { hasLicense, type LicenseFeatureKey } from '@/lib/services/license';

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
