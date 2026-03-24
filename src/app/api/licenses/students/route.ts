import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, isResponse } from '@/lib/api';
import {
  getTenantLicenseOverview,
  assignBulkLicenses,
  revokeBulkLicenses,
  type LicenseFeatureKey,
  ALL_LICENSE_FEATURES,
} from '@/lib/services/license';

/** GET /api/licenses/students — 지점 학생 이용권 현황 (OWNER+) */
export async function GET(_request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.tenantId || user.viewingTenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: { code: 'NO_TENANT', message: '지점이 설정되지 않았습니다' } },
      { status: 400 }
    );
  }

  const overview = await getTenantLicenseOverview(tenantId);

  return NextResponse.json({ data: overview });
}

/** POST /api/licenses/students — 이용권 일괄 배정 (OWNER+) */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.tenantId || user.viewingTenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: { code: 'NO_TENANT', message: '지점이 설정되지 않았습니다' } },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { studentIds, features, expiresAt } = body as {
    studentIds: string[];
    features: LicenseFeatureKey[];
    expiresAt?: string;
  };

  if (!studentIds?.length || !features?.length) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: '학생과 기능을 선택해주세요' } },
      { status: 400 }
    );
  }

  // 유효한 기능만 필터
  const validFeatures = features.filter((f) => ALL_LICENSE_FEATURES.includes(f));
  if (!validFeatures.length) {
    return NextResponse.json(
      { error: { code: 'INVALID_FEATURE', message: '유효하지 않은 기능입니다' } },
      { status: 400 }
    );
  }

  const result = await assignBulkLicenses({
    studentIds,
    features: validFeatures,
    tenantId,
    assignedBy: user.id,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  });

  return NextResponse.json({ data: result });
}

/** DELETE /api/licenses/students — 이용권 일괄 회수 (OWNER+) */
export async function DELETE(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { studentIds, features } = body as {
    studentIds: string[];
    features: LicenseFeatureKey[];
  };

  if (!studentIds?.length || !features?.length) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: '학생과 기능을 선택해주세요' } },
      { status: 400 }
    );
  }

  const validFeatures = features.filter((f) => ALL_LICENSE_FEATURES.includes(f));

  const result = await revokeBulkLicenses({
    studentIds,
    features: validFeatures,
  });

  return NextResponse.json({ data: result });
}
