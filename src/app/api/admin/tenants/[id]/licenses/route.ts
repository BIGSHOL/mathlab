import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, isResponse } from '@/lib/api';
import {
  getTenantLicenses,
  upsertTenantLicense,
  type LicenseFeatureKey,
  ALL_LICENSE_FEATURES,
  fromEnum,
} from '@/lib/services/license';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/admin/tenants/[id]/licenses — 지점 이용권 목록 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id: tenantId } = await params;
  const licenses = await getTenantLicenses(tenantId);

  // enum → key 변환하여 반환
  const data = licenses.map((l) => ({
    ...l,
    featureKey: fromEnum(l.feature),
  }));

  return NextResponse.json({ data });
}

/** POST /api/admin/tenants/[id]/licenses — 지점 이용권 생성/수정 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id: tenantId } = await params;
  const body = await request.json();
  const { feature, maxSeats, expiresAt, memo, isActive } = body as {
    feature: LicenseFeatureKey;
    maxSeats: number;
    expiresAt?: string | null;
    memo?: string | null;
    isActive?: boolean;
  };

  if (!feature || !ALL_LICENSE_FEATURES.includes(feature)) {
    return NextResponse.json(
      { error: { code: 'INVALID_FEATURE', message: '유효하지 않은 기능입니다' } },
      { status: 400 }
    );
  }

  if (!maxSeats || maxSeats < 1) {
    return NextResponse.json(
      { error: { code: 'INVALID_SEATS', message: '좌석 수는 1 이상이어야 합니다' } },
      { status: 400 }
    );
  }

  const license = await upsertTenantLicense({
    tenantId,
    feature,
    maxSeats,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    memo: memo ?? null,
    isActive: isActive ?? true,
  });

  return NextResponse.json({ data: { ...license, featureKey: fromEnum(license.feature) } });
}

/** PATCH /api/admin/tenants/[id]/licenses — 지점 이용권 수정 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id: tenantId } = await params;
  const body = await request.json();
  const { feature, maxSeats, expiresAt, memo, isActive } = body as {
    feature: LicenseFeatureKey;
    maxSeats?: number;
    expiresAt?: string | null;
    memo?: string | null;
    isActive?: boolean;
  };

  if (!feature || !ALL_LICENSE_FEATURES.includes(feature)) {
    return NextResponse.json(
      { error: { code: 'INVALID_FEATURE', message: '유효하지 않은 기능입니다' } },
      { status: 400 }
    );
  }

  const license = await upsertTenantLicense({
    tenantId,
    feature,
    maxSeats: maxSeats ?? 0,
    ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    ...(memo !== undefined && { memo }),
    ...(isActive !== undefined && { isActive }),
  });

  return NextResponse.json({ data: { ...license, featureKey: fromEnum(license.feature) } });
}
