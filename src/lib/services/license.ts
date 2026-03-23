import { prisma } from '@/lib/db';
import { LicenseFeature } from '@prisma/client';

// === 타입 ===

export type LicenseFeatureKey =
  | 'concept'
  | 'arithmetic'
  | 'time_attack'
  | 'test'
  | 'revenge'
  | 'diagnostic'
  | 'quiz';

export const ALL_LICENSE_FEATURES: LicenseFeatureKey[] = [
  'concept',
  'arithmetic',
  'time_attack',
  'test',
  'revenge',
  'diagnostic',
  'quiz',
];

/** 한글 라벨 */
export const LICENSE_FEATURE_LABELS: Record<LicenseFeatureKey, string> = {
  concept: '개념 학습',
  arithmetic: '연산 연습',
  time_attack: '타임어택',
  test: '시험',
  revenge: '복수전',
  diagnostic: '레벨테스트',
  quiz: '실시간 퀴즈',
};

/** LicenseFeatureKey ↔ Prisma LicenseFeature enum 매핑 */
const TO_ENUM: Record<LicenseFeatureKey, LicenseFeature> = {
  concept: 'CONCEPT',
  arithmetic: 'ARITHMETIC',
  time_attack: 'TIME_ATTACK',
  test: 'TEST',
  revenge: 'REVENGE',
  diagnostic: 'DIAGNOSTIC',
  quiz: 'QUIZ',
};

const FROM_ENUM: Record<LicenseFeature, LicenseFeatureKey> = {
  CONCEPT: 'concept',
  ARITHMETIC: 'arithmetic',
  TIME_ATTACK: 'time_attack',
  TEST: 'test',
  REVENGE: 'revenge',
  DIAGNOSTIC: 'diagnostic',
  QUIZ: 'quiz',
};

export function toEnum(key: LicenseFeatureKey): LicenseFeature {
  return TO_ENUM[key];
}

export function fromEnum(e: LicenseFeature): LicenseFeatureKey {
  return FROM_ENUM[e];
}

// === 핵심 조회 ===

/** 단일 기능 라이선스 확인 (API 가드용) */
export async function hasLicense(
  studentId: string,
  feature: LicenseFeatureKey
): Promise<boolean> {
  const now = new Date();
  const sl = await prisma.studentLicense.findFirst({
    where: {
      studentId,
      feature: TO_ENUM[feature],
      revokedAt: null,
    },
    include: { tenantLicense: true },
  });

  if (!sl) return false;
  if (sl.expiresAt && sl.expiresAt <= now) return false;
  if (sl.tenantLicense.expiresAt && sl.tenantLicense.expiresAt <= now) return false;
  if (!sl.tenantLicense.isActive) return false;

  return true;
}

/** 학생의 전체 라이선스 상태 일괄 조회 (사이드바/클라이언트용) */
export async function getStudentLicenses(
  studentId: string
): Promise<Record<LicenseFeatureKey, { licensed: boolean; expiresAt: Date | null }>> {
  const now = new Date();

  const activeLicenses = await prisma.studentLicense.findMany({
    where: {
      studentId,
      revokedAt: null,
    },
    include: { tenantLicense: true },
  });

  const result = {} as Record<LicenseFeatureKey, { licensed: boolean; expiresAt: Date | null }>;

  for (const key of ALL_LICENSE_FEATURES) {
    result[key] = { licensed: false, expiresAt: null };
  }

  for (const sl of activeLicenses) {
    const key = FROM_ENUM[sl.feature];
    if (!key) continue;

    // 만료 체크
    if (sl.expiresAt && sl.expiresAt <= now) continue;
    if (sl.tenantLicense.expiresAt && sl.tenantLicense.expiresAt <= now) continue;
    if (!sl.tenantLicense.isActive) continue;

    // 유효한 만료일 계산 (둘 중 빠른 것)
    const dates = [sl.expiresAt, sl.tenantLicense.expiresAt].filter(Boolean) as Date[];
    const effectiveExpiry = dates.length > 0
      ? new Date(Math.min(...dates.map(d => d.getTime())))
      : null;

    result[key] = { licensed: true, expiresAt: effectiveExpiry };
  }

  return result;
}

// === 배정/회수 ===

/** 라이선스 배정 */
export async function assignLicense(params: {
  studentId: string;
  feature: LicenseFeatureKey;
  tenantId: string;
  assignedBy: string;
  expiresAt?: Date | null;
}): Promise<{ success: true } | { success: false; reason: string }> {
  const featureEnum = TO_ENUM[params.feature];

  return await prisma.$transaction(async (tx) => {
    // 1. TenantLicense 확인
    const tl = await tx.tenantLicense.findUnique({
      where: { tenantId_feature: { tenantId: params.tenantId, feature: featureEnum } },
    });
    if (!tl) return { success: false, reason: '지점에 해당 이용권이 없습니다' };
    if (!tl.isActive) return { success: false, reason: '비활성화된 이용권입니다' };
    if (tl.expiresAt && tl.expiresAt <= new Date()) {
      return { success: false, reason: '만료된 이용권입니다' };
    }

    // 2. 좌석 확인
    const activeCount = await tx.studentLicense.count({
      where: { tenantLicenseId: tl.id, revokedAt: null },
    });
    if (activeCount >= tl.maxSeats) {
      return { success: false, reason: `좌석이 부족합니다 (${activeCount}/${tl.maxSeats})` };
    }

    // 3. 중복 체크
    const existing = await tx.studentLicense.findFirst({
      where: { studentId: params.studentId, feature: featureEnum, revokedAt: null },
    });
    if (existing) return { success: false, reason: '이미 배정된 이용권입니다' };

    // 4. 배정
    await tx.studentLicense.create({
      data: {
        studentId: params.studentId,
        tenantLicenseId: tl.id,
        feature: featureEnum,
        expiresAt: params.expiresAt ?? null,
        assignedBy: params.assignedBy,
      },
    });

    // 5. usedSeats 업데이트
    await tx.tenantLicense.update({
      where: { id: tl.id },
      data: { usedSeats: activeCount + 1 },
    });

    return { success: true };
  });
}

/** 라이선스 회수 */
export async function revokeLicense(params: {
  studentId: string;
  feature: LicenseFeatureKey;
}): Promise<{ success: true } | { success: false; reason: string }> {
  const featureEnum = TO_ENUM[params.feature];

  return await prisma.$transaction(async (tx) => {
    const sl = await tx.studentLicense.findFirst({
      where: { studentId: params.studentId, feature: featureEnum, revokedAt: null },
    });
    if (!sl) return { success: false, reason: '활성 이용권이 없습니다' };

    await tx.studentLicense.update({
      where: { id: sl.id },
      data: { revokedAt: new Date() },
    });

    // usedSeats 감소
    const activeCount = await tx.studentLicense.count({
      where: { tenantLicenseId: sl.tenantLicenseId, revokedAt: null },
    });
    await tx.tenantLicense.update({
      where: { id: sl.tenantLicenseId },
      data: { usedSeats: activeCount },
    });

    return { success: true };
  });
}

/** 일괄 배정 */
export async function assignBulkLicenses(params: {
  studentIds: string[];
  features: LicenseFeatureKey[];
  tenantId: string;
  assignedBy: string;
  expiresAt?: Date | null;
}): Promise<{
  assigned: Array<{ studentId: string; feature: LicenseFeatureKey }>;
  failed: Array<{ studentId: string; feature: LicenseFeatureKey; reason: string }>;
}> {
  const assigned: Array<{ studentId: string; feature: LicenseFeatureKey }> = [];
  const failed: Array<{ studentId: string; feature: LicenseFeatureKey; reason: string }> = [];

  for (const studentId of params.studentIds) {
    for (const feature of params.features) {
      const result = await assignLicense({
        studentId,
        feature,
        tenantId: params.tenantId,
        assignedBy: params.assignedBy,
        expiresAt: params.expiresAt,
      });
      if (result.success) {
        assigned.push({ studentId, feature });
      } else {
        failed.push({ studentId, feature, reason: result.reason });
      }
    }
  }

  return { assigned, failed };
}

/** 일괄 회수 */
export async function revokeBulkLicenses(params: {
  studentIds: string[];
  features: LicenseFeatureKey[];
}): Promise<{
  revoked: Array<{ studentId: string; feature: LicenseFeatureKey }>;
  failed: Array<{ studentId: string; feature: LicenseFeatureKey; reason: string }>;
}> {
  const revoked: Array<{ studentId: string; feature: LicenseFeatureKey }> = [];
  const failed: Array<{ studentId: string; feature: LicenseFeatureKey; reason: string }> = [];

  for (const studentId of params.studentIds) {
    for (const feature of params.features) {
      const result = await revokeLicense({ studentId, feature });
      if (result.success) {
        revoked.push({ studentId, feature });
      } else {
        failed.push({ studentId, feature, reason: result.reason });
      }
    }
  }

  return { revoked, failed };
}

// === TenantLicense 관리 (SUPER_ADMIN) ===

/** 지점 이용권 목록 조회 */
export async function getTenantLicenses(tenantId: string) {
  return prisma.tenantLicense.findMany({
    where: { tenantId },
    orderBy: { feature: 'asc' },
  });
}

/** 지점 이용권 생성/수정 */
export async function upsertTenantLicense(params: {
  tenantId: string;
  feature: LicenseFeatureKey;
  maxSeats: number;
  expiresAt?: Date | null;
  memo?: string | null;
  isActive?: boolean;
}) {
  const featureEnum = TO_ENUM[params.feature];

  return prisma.tenantLicense.upsert({
    where: { tenantId_feature: { tenantId: params.tenantId, feature: featureEnum } },
    create: {
      tenantId: params.tenantId,
      feature: featureEnum,
      maxSeats: params.maxSeats,
      expiresAt: params.expiresAt ?? null,
      memo: params.memo ?? null,
      isActive: params.isActive ?? true,
    },
    update: {
      ...(params.maxSeats !== undefined && { maxSeats: params.maxSeats }),
      ...(params.expiresAt !== undefined && { expiresAt: params.expiresAt }),
      ...(params.memo !== undefined && { memo: params.memo }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    },
  });
}

/** usedSeats 재계산 (복구/동기화용) */
export async function syncUsedSeats(tenantLicenseId: string) {
  const count = await prisma.studentLicense.count({
    where: { tenantLicenseId, revokedAt: null },
  });
  await prisma.tenantLicense.update({
    where: { id: tenantLicenseId },
    data: { usedSeats: count },
  });
  return count;
}

/** 지점 이용권 + 배정 학생 목록 조회 (OWNER 관리 페이지용) */
export async function getTenantLicenseOverview(tenantId: string) {
  const licenses = await prisma.tenantLicense.findMany({
    where: { tenantId },
    orderBy: { feature: 'asc' },
  });

  // 해당 지점의 학생 목록
  const students = await prisma.user.findMany({
    where: { tenantId, role: 'STUDENT', deletedAt: null },
    select: {
      id: true,
      name: true,
      username: true,
      classroom: { select: { id: true, name: true } },
      studentLicenses: {
        where: { revokedAt: null },
        select: { feature: true, expiresAt: true, assignedAt: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return { licenses, students };
}
