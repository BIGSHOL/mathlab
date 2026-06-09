import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { LicenseFeature } from '@prisma/client';

// LicenseFeature enum 값 (schema.prisma 와 동기화)
const VALID_FEATURES: readonly LicenseFeature[] = [
  'CONCEPT', 'ARITHMETIC', 'TIME_ATTACK', 'TEST', 'REVENGE', 'DIAGNOSTIC', 'QUIZ',
  'EXAM_ANALYSIS', 'HOMEWORK', 'WORKSHEET', 'EXAM_PREP', 'OX_QUIZ', 'WORKBOOK',
];

export function isLicenseFeature(v: unknown): v is LicenseFeature {
  return typeof v === 'string' && (VALID_FEATURES as readonly string[]).includes(v);
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e
    && (e as { code?: string }).code === 'P2002';
}

export interface GrantResult {
  applied: boolean; // false = 멱등(이미 적립된 주문)
  balance?: number;
  totalPurchased?: number;
}

/**
 * 지점(Tenant) 이용권 풀에 크레딧 충전 — para-x 결제 승인 → 적립.
 * 원장(EntitlementLedger) 기록 + 풀(TenantEntitlement) 증가를 한 트랜잭션으로.
 * 멱등: refOrderId 가 EntitlementLedger 에서 유니크 → 같은 주문 재시도는 중복 적립 안 함
 *       (선조회 + 유니크 제약 백스톱으로 동시성 레이스까지 차단).
 */
export async function grantCredits(
  tenantId: string,
  feature: LicenseFeature,
  qty: number,
  opts: { refOrderId?: string | null; userId?: string | null; amount?: number | null } = {},
): Promise<GrantResult> {
  const { refOrderId = null, userId = null, amount = null } = opts;
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('qty must be a positive integer');

  try {
    return await prisma.$transaction(async (tx) => {
      // 멱등 가드: 원장에 먼저 기록(refOrderId 유니크) → 중복이면 P2002 로 롤백
      await tx.entitlementLedger.create({
        data: { tenantId, userId, feature, delta: qty, reason: 'purchase', refOrderId, amount },
      });
      const pool = await tx.tenantEntitlement.upsert({
        where: { tenantId_feature: { tenantId, feature } },
        create: { tenantId, feature, balance: qty, totalPurchased: qty },
        update: { balance: { increment: qty }, totalPurchased: { increment: qty } },
      });
      return { applied: true, balance: pool.balance, totalPurchased: pool.totalPurchased };
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { applied: false }; // 이미 적립된 주문(멱등)
    throw e;
  }
}

// ───────────────────────────────────────────────────────────────
//  배정 (원장: 지점 풀 → 학생)
// ───────────────────────────────────────────────────────────────

/**
 * 지점 풀에서 학생에게 이용권 배정.
 * 트랜잭션: 풀 balance -= qty (부족 시 INSUFFICIENT_POOL) + StudentLicense.allocated += qty + 원장 ledger(allocate).
 */
export async function allocateToStudent(
  tenantId: string,
  userId: string,
  feature: LicenseFeature,
  qty: number,
): Promise<{ allocated: number; used: number; poolBalance: number }> {
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('qty must be a positive integer');

  return prisma.$transaction(async (tx) => {
    const pool = await tx.tenantEntitlement.findUnique({
      where: { tenantId_feature: { tenantId, feature } },
    });
    if (!pool || pool.balance < qty) throw new Error('INSUFFICIENT_POOL');

    await tx.tenantEntitlement.update({
      where: { tenantId_feature: { tenantId, feature } },
      data: { balance: { decrement: qty } },
    });
    const lic = await tx.studentLicense.upsert({
      where: { tenantId_userId_feature: { tenantId, userId, feature } },
      create: { tenantId, userId, feature, allocated: qty, used: 0 },
      update: { allocated: { increment: qty } },
    });
    await tx.entitlementLedger.create({
      data: { tenantId, userId, feature, delta: qty, reason: 'allocate' },
    });
    return { allocated: lic.allocated, used: lic.used, poolBalance: pool.balance - qty };
  });
}

// ───────────────────────────────────────────────────────────────
//  소비 (기출분석 EXAM_ANALYSIS) — 학생 시험지 단위 멱등
// ───────────────────────────────────────────────────────────────

const EXAM_FEATURE: LicenseFeature = 'EXAM_ANALYSIS';
type ExamPaperLike = { id: string; tenantId: string; studentId: string | null };
const consumeRef = (examPaperId: string) => `examPaper:${examPaperId}`;

/** 이 시험지로 이미 차감했는지(재분석 멱등) */
async function alreadyConsumed(examPaperId: string): Promise<boolean> {
  const row = await prisma.entitlementLedger.findUnique({ where: { refOrderId: consumeRef(examPaperId) } });
  return !!row;
}

/**
 * 기출분석 이용권 게이트 — Gemini 호출 전. (실패=NextResponse 403, 통과=null; guard.ts 패턴)
 * 학생 시험지(studentId 있음)일 때만 적용. 재분석(이미 차감)은 통과.
 */
export async function assertExamAnalysisCredit(examPaper: ExamPaperLike): Promise<NextResponse | null> {
  if (!examPaper.studentId) return null; // 블랭크/템플릿 → 크레딧 미적용
  if (await alreadyConsumed(examPaper.id)) return null; // 재분석 — 이미 차감됨

  const lic = await prisma.studentLicense.findUnique({
    where: { tenantId_userId_feature: { tenantId: examPaper.tenantId, userId: examPaper.studentId, feature: EXAM_FEATURE } },
  });
  const remaining = lic ? lic.allocated - lic.used : 0;
  if (remaining <= 0) {
    return NextResponse.json(
      { error: { code: 'ENTITLEMENT_EXHAUSTED', message: '이 학생의 기출분석 이용권이 부족합니다. 원장에게 배정을 요청하세요.' } },
      { status: 403 },
    );
  }
  return null;
}

/**
 * 기출분석 성공 후 1 차감 — 학생 시험지일 때만, 시험지 단위 멱등(refOrderId=examPaper:<id>).
 * 재분석은 유니크 제약으로 중복 차감 안 함.
 */
export async function consumeExamAnalysisCredit(examPaper: ExamPaperLike): Promise<void> {
  const { studentId, tenantId } = examPaper;
  if (!studentId) return;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.entitlementLedger.create({
        data: { tenantId, userId: studentId, feature: EXAM_FEATURE, delta: -1, reason: 'consume', refOrderId: consumeRef(examPaper.id) },
      });
      await tx.studentLicense.update({
        where: { tenantId_userId_feature: { tenantId, userId: studentId, feature: EXAM_FEATURE } },
        data: { used: { increment: 1 } },
      });
    });
  } catch (e) {
    if (isUniqueViolation(e)) return; // 이미 차감(재분석)
    throw e;
  }
}

// ───────────────────────────────────────────────────────────────
//  조회 (원장 배정 화면)
// ───────────────────────────────────────────────────────────────

export interface EntitlementOverview {
  pools: { feature: LicenseFeature; balance: number; totalPurchased: number }[];
  students: {
    id: string; name: string; username: string; grade: number | null;
    licenses: { feature: LicenseFeature; allocated: number; used: number }[];
  }[];
}

/** 지점 풀 잔액 + 학생별 배정/사용 현황 (원장 UI용) */
export async function getEntitlementOverview(tenantId: string): Promise<EntitlementOverview> {
  const [pools, students, licenses] = await Promise.all([
    prisma.tenantEntitlement.findMany({ where: { tenantId }, orderBy: { feature: 'asc' } }),
    prisma.user.findMany({
      where: { tenantId, role: 'STUDENT', deletedAt: null },
      select: { id: true, name: true, username: true, grade: true },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      take: 1000,
    }),
    prisma.studentLicense.findMany({ where: { tenantId } }),
  ]);

  const byUser = new Map<string, { feature: LicenseFeature; allocated: number; used: number }[]>();
  for (const l of licenses) {
    const arr = byUser.get(l.userId) ?? [];
    arr.push({ feature: l.feature, allocated: l.allocated, used: l.used });
    byUser.set(l.userId, arr);
  }

  return {
    pools: pools.map((p) => ({ feature: p.feature, balance: p.balance, totalPurchased: p.totalPurchased })),
    students: students.map((s) => ({
      id: s.id, name: s.name, username: s.username, grade: s.grade,
      licenses: byUser.get(s.id) ?? [],
    })),
  };
}
