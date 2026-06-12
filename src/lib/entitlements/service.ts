import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { LicenseFeature, Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

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

// ───────────────────────────────────────────────────────────────
//  크레딧 유효기간 (약관 제6조: 충전일로부터 1년, 경과 시 소멸)
//  충전 단위 lot(EntitlementCreditLot)으로 추적 — userId null = 지점 풀, 값 = 학생 배정분.
//  사용 가능 잔액 = SUM(remaining) WHERE expiresAt > now (만료는 조회 시점 계산, sweep 없음).
//  차감 순서 = 만료 임박분 우선 (FIFO by expiresAt).
// ───────────────────────────────────────────────────────────────

/** 충전일 기준 만료일 — 충전일 + 1년 */
export function creditExpiryFrom(grantedAt: Date): Date {
  const d = new Date(grantedAt);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** 사용 가능(미만료·잔여>0) lot — 만료 임박순 */
function findUsableLots(tx: Tx, tenantId: string, feature: LicenseFeature, userId: string | null, now: Date) {
  return tx.entitlementCreditLot.findMany({
    where: { tenantId, feature, userId, remaining: { gt: 0 }, expiresAt: { gt: now } },
    orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
  });
}

/** lot 에서 qty 차감 — remaining 가드로 동시성 레이스 차단. 성공 여부 반환 */
async function takeFromLot(tx: Tx, lotId: string, take: number): Promise<boolean> {
  const r = await tx.entitlementCreditLot.updateMany({
    where: { id: lotId, remaining: { gte: take } },
    data: { remaining: { decrement: take } },
  });
  return r.count === 1;
}

export interface GrantResult {
  applied: boolean; // false = 멱등(이미 적립된 주문)
  balance?: number;
  totalPurchased?: number;
  expiresAt?: string; // 이번 충전분 만료일 (충전일 + 1년)
}

/**
 * 지점(Tenant) 이용권 풀에 크레딧 충전 — para-x 결제 승인 → 적립.
 * 원장(EntitlementLedger) 기록 + lot 생성(만료일 = 충전일 + 1년) + 풀(TenantEntitlement) 증가를 한 트랜잭션으로.
 * 구독 월 충전분도 같은 함수로 지급된다(웹훅 subscription 분기가 매 갱신마다 PLANS.monthlyCredits 만큼 호출,
 * refOrderId=`<orderId>:monthly-credits`) → 각 충전일 기준 1년 만료가 동일 적용.
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

  const grantedAt = new Date();
  const expiresAt = creditExpiryFrom(grantedAt);

  try {
    return await prisma.$transaction(async (tx) => {
      // 멱등 가드: 원장에 먼저 기록(refOrderId 유니크) → 중복이면 P2002 로 롤백
      await tx.entitlementLedger.create({
        data: { tenantId, userId, feature, delta: qty, reason: 'purchase', refOrderId, amount },
      });
      await tx.entitlementCreditLot.create({
        data: { tenantId, feature, granted: qty, remaining: qty, grantedAt, expiresAt, refOrderId },
      });
      const pool = await tx.tenantEntitlement.upsert({
        where: { tenantId_feature: { tenantId, feature } },
        create: { tenantId, feature, balance: qty, totalPurchased: qty },
        update: { balance: { increment: qty }, totalPurchased: { increment: qty } },
      });
      return {
        applied: true,
        balance: pool.balance,
        totalPurchased: pool.totalPurchased,
        expiresAt: expiresAt.toISOString(),
      };
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
 * 트랜잭션: 풀 lot 에서 만료 임박순 차감 → 만료일을 승계한 학생 lot 생성
 *           + 풀 balance -= qty (부족 시 INSUFFICIENT_POOL) + StudentLicense.allocated += qty + 원장 ledger(allocate).
 * 만료된 lot 은 차감 대상에서 제외 — 만료분은 배정 불가(약관 제6조 소멸).
 * lot 이 하나도 없으면 레거시 카운터로 폴백 (백필 전 롤아웃 안전장치).
 */
export async function allocateToStudent(
  tenantId: string,
  userId: string,
  feature: LicenseFeature,
  qty: number,
): Promise<{ allocated: number; used: number; poolBalance: number }> {
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('qty must be a positive integer');
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const pool = await tx.tenantEntitlement.findUnique({
      where: { tenantId_feature: { tenantId, feature } },
    });
    if (!pool) throw new Error('INSUFFICIENT_POOL');

    const hasLots = (await tx.entitlementCreditLot.count({
      where: { tenantId, feature, userId: null },
    })) > 0;

    let poolUsableAfter = pool.balance - qty; // 레거시 폴백 시 카운터 기준
    if (hasLots) {
      const lots = await findUsableLots(tx, tenantId, feature, null, now);
      const usable = lots.reduce((s, l) => s + l.remaining, 0);
      if (usable < qty) throw new Error('INSUFFICIENT_POOL');
      poolUsableAfter = usable - qty;

      // 만료 임박분부터 차감 + 같은 만료일을 승계한 학생 lot 생성
      let left = qty;
      for (const lot of lots) {
        if (left <= 0) break;
        const take = Math.min(lot.remaining, left);
        if (!(await takeFromLot(tx, lot.id, take))) throw new Error('INSUFFICIENT_POOL'); // 동시성 레이스 → 롤백
        await tx.entitlementCreditLot.create({
          data: {
            tenantId, userId, feature, granted: take, remaining: take,
            grantedAt: lot.grantedAt, expiresAt: lot.expiresAt, refOrderId: lot.refOrderId,
          },
        });
        left -= take;
      }
    } else if (pool.balance < qty) {
      throw new Error('INSUFFICIENT_POOL');
    }

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
    return { allocated: lic.allocated, used: lic.used, poolBalance: poolUsableAfter };
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
 * 크레딧을 차감하는 분석은 플랜 월 쿼터 면제 — 라우트는 assertAnalysisGate(guard.ts)로 진입할 것.
 * 잔여는 lot 기준(만료분 제외) — lot 이 전혀 없으면 레거시 카운터 폴백(백필 전 안전장치).
 */
export async function assertExamAnalysisCredit(examPaper: ExamPaperLike): Promise<NextResponse | null> {
  if (!examPaper.studentId) return null; // 블랭크/템플릿 → 크레딧 미적용
  try {
    if (await alreadyConsumed(examPaper.id)) return null; // 재분석 — 이미 차감됨

    const { tenantId, studentId } = examPaper;
    const now = new Date();
    const hasLots = (await prisma.entitlementCreditLot.count({
      where: { tenantId, userId: studentId, feature: EXAM_FEATURE },
    })) > 0;

    let remaining: number;
    if (hasLots) {
      const agg = await prisma.entitlementCreditLot.aggregate({
        where: { tenantId, userId: studentId, feature: EXAM_FEATURE, remaining: { gt: 0 }, expiresAt: { gt: now } },
        _sum: { remaining: true },
      });
      remaining = agg._sum.remaining ?? 0;
    } else {
      const lic = await prisma.studentLicense.findUnique({
        where: { tenantId_userId_feature: { tenantId, userId: studentId, feature: EXAM_FEATURE } },
      });
      remaining = lic ? lic.allocated - lic.used : 0;
    }

    if (remaining <= 0) {
      return NextResponse.json(
        { error: { code: 'ENTITLEMENT_EXHAUSTED', message: '이 학생의 기출분석 이용권이 부족합니다. 이용권은 충전일로부터 1년이 지나면 소멸됩니다. 원장에게 배정을 요청하세요.' } },
        { status: 403 },
      );
    }
    return null;
  } catch (e) {
    // fail-open: 이용권 테이블 미배포/일시 오류 시 게이팅을 건너뛰어 기존 분석 흐름을 보호.
    // 학생 시험지는 월 쿼터 면제(assertAnalysisGate)라 이 경우 게이트 없이 통과 — 의도된 트레이드오프
    // (분석 차단보다 일시 오류 시 무료 통과가 낫다). 롤아웃 안전장치 — parax-entitlements.sql 적용 전에도 깨지지 않도록.
    console.error('[이용권] 게이트 확인 실패 — 크레딧 게이팅 건너뜀:', e);
    return null;
  }
}

/**
 * 기출분석 성공 후 1 차감 — 학생 시험지일 때만, 시험지 단위 멱등(refOrderId=examPaper:<id>).
 * 만료 임박 lot 부터 차감 (FIFO by expiresAt, 만료분 제외). 재분석은 유니크 제약으로 중복 차감 안 함.
 * 사용 가능 lot 이 없으면 카운터만 기록 — 분석은 이미 완료된 시점이므로 실패시키지 않음(fail-open).
 */
export async function consumeExamAnalysisCredit(examPaper: ExamPaperLike): Promise<void> {
  const { studentId, tenantId } = examPaper;
  if (!studentId) return;
  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.entitlementLedger.create({
        data: { tenantId, userId: studentId, feature: EXAM_FEATURE, delta: -1, reason: 'consume', refOrderId: consumeRef(examPaper.id) },
      });
      const lot = await tx.entitlementCreditLot.findFirst({
        where: { tenantId, userId: studentId, feature: EXAM_FEATURE, remaining: { gt: 0 }, expiresAt: { gt: now } },
        orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
      });
      if (lot) await takeFromLot(tx, lot.id, 1);
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
  pools: {
    feature: LicenseFeature;
    balance: number; // 사용 가능 잔액 — 만료분 제외 (lot 없으면 레거시 카운터)
    totalPurchased: number;
    nextExpiry: { qty: number; at: string } | null; // 가장 임박한 만료 예정분
  }[];
  students: {
    id: string; name: string; username: string; grade: number | null;
    licenses: { feature: LicenseFeature; allocated: number; used: number; usable: number }[];
  }[];
}

/** 지점 풀 잔액 + 학생별 배정/사용 현황 (원장 UI용) — 잔액·잔여는 만료분 제외 */
export async function getEntitlementOverview(tenantId: string): Promise<EntitlementOverview> {
  const [pools, students, licenses, lots] = await Promise.all([
    prisma.tenantEntitlement.findMany({ where: { tenantId }, orderBy: { feature: 'asc' } }),
    prisma.user.findMany({
      where: { tenantId, role: 'STUDENT', deletedAt: null },
      select: { id: true, name: true, username: true, grade: true },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      take: 1000,
    }),
    prisma.studentLicense.findMany({ where: { tenantId } }),
    prisma.entitlementCreditLot.findMany({
      where: { tenantId, remaining: { gt: 0 } },
      orderBy: { expiresAt: 'asc' },
    }),
  ]);

  const now = new Date();

  // lot 집계 — 풀(userId null)/학생별 사용 가능 잔액(만료 제외) + 풀 최근접 만료
  const poolHasLots = new Set<LicenseFeature>();
  const poolUsable = new Map<LicenseFeature, number>();
  const poolNextExpiry = new Map<LicenseFeature, { qty: number; at: string }>();
  const studentHasLots = new Set<string>(); // `${userId}|${feature}`
  const studentUsable = new Map<string, number>();

  for (const lot of lots) {
    if (lot.userId === null) {
      poolHasLots.add(lot.feature);
      if (lot.expiresAt <= now) continue; // 만료분 제외
      poolUsable.set(lot.feature, (poolUsable.get(lot.feature) ?? 0) + lot.remaining);
      const at = lot.expiresAt.toISOString();
      const ne = poolNextExpiry.get(lot.feature);
      if (!ne) poolNextExpiry.set(lot.feature, { qty: lot.remaining, at });
      else if (ne.at === at) ne.qty += lot.remaining; // 같은 만료일(expiresAt asc 정렬이라 최근접만 누적됨)
    } else {
      const key = `${lot.userId}|${lot.feature}`;
      studentHasLots.add(key);
      if (lot.expiresAt <= now) continue;
      studentUsable.set(key, (studentUsable.get(key) ?? 0) + lot.remaining);
    }
  }

  const byUser = new Map<string, { feature: LicenseFeature; allocated: number; used: number; usable: number }[]>();
  for (const l of licenses) {
    const arr = byUser.get(l.userId) ?? [];
    const key = `${l.userId}|${l.feature}`;
    const usable = studentHasLots.has(key)
      ? (studentUsable.get(key) ?? 0)
      : Math.max(0, l.allocated - l.used); // 레거시 폴백 (백필 전)
    arr.push({ feature: l.feature, allocated: l.allocated, used: l.used, usable });
    byUser.set(l.userId, arr);
  }

  return {
    pools: pools.map((p) => ({
      feature: p.feature,
      balance: poolHasLots.has(p.feature) ? (poolUsable.get(p.feature) ?? 0) : p.balance,
      totalPurchased: p.totalPurchased,
      nextExpiry: poolNextExpiry.get(p.feature) ?? null,
    })),
    students: students.map((s) => ({
      id: s.id, name: s.name, username: s.username, grade: s.grade,
      licenses: byUser.get(s.id) ?? [],
    })),
  };
}
