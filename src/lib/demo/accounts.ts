/**
 * 데모 전용 지점 + 일회용 체험 계정 헬퍼 (서버 전용).
 *
 * - 데모 전용 지점(slug 'demo')을 `Tenant.settings` 로 표시: { demo, demoLimit, accountLimits }.
 * - 체험 한도는 신규 계정 기본값(demoLimit) + 계정별 override(accountLimits[userId]).
 * - 체험 사용량 = 그 계정(teacherId)이 분석 완료(COMPLETED)한 시험지 수(평생).
 * - 분석 게이트: 데모 계정은 평생 N회만 허용하고 일반 월 쿼터/크레딧은 면제(assertDemoAnalysisLimit).
 *
 * DB 마이그레이션 없음 — 기존 Json? settings 필드와 examPaper 카운트만 사용.
 */
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export const DEMO_TENANT_SLUG = 'demo';
export const DEMO_TENANT_NAME = '데모 체험';
export const DEFAULT_DEMO_LIMIT = 3;
const MAX_DEMO_LIMIT = 1000;

/** 한도 정규화 — 정수 0~1000 클램프, 비정상 입력은 fallback. */
export function clampLimit(value: unknown, fallback = DEFAULT_DEMO_LIMIT): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(MAX_DEMO_LIMIT, Math.floor(n)));
}

/** 데모 계정별 체험 권한 — 분석 / AI 총평 / 블로그 글·복사. 기본 전체 허용. */
export interface DemoPerms {
  analyze: boolean;
  commentary: boolean;
  blog: boolean;
}
export const DEMO_PERM_KEYS = ['analyze', 'commentary', 'blog'] as const;
export const DEFAULT_DEMO_PERMS: DemoPerms = { analyze: true, commentary: true, blog: true };

/** 권한 파싱 — 명시적 false 만 차단, 미설정/true 는 허용(기본 전체 허용). */
export function parseDemoPerms(raw: unknown): DemoPerms {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    analyze: o.analyze !== false,
    commentary: o.commentary !== false,
    blog: o.blog !== false,
  };
}

export interface DemoSettings {
  demo: boolean;
  demoLimit: number;
  accountLimits: Record<string, number>;
  accountPerms: Record<string, DemoPerms>;
}

/** Tenant.settings(JSON) → 데모 설정. demo 플래그 없으면 비활성. */
export function parseDemoSettings(settings: unknown): DemoSettings {
  const s = settings && typeof settings === 'object' && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)
    : {};
  const demo = s.demo === true;
  const demoLimit = clampLimit(s.demoLimit);
  const rawLimits = s.accountLimits && typeof s.accountLimits === 'object' && !Array.isArray(s.accountLimits)
    ? (s.accountLimits as Record<string, unknown>)
    : {};
  const accountLimits: Record<string, number> = {};
  for (const [userId, raw] of Object.entries(rawLimits)) {
    const n = Number(raw);
    if (Number.isFinite(n)) accountLimits[userId] = clampLimit(n);
  }
  const rawPerms = s.accountPerms && typeof s.accountPerms === 'object' && !Array.isArray(s.accountPerms)
    ? (s.accountPerms as Record<string, unknown>)
    : {};
  const accountPerms: Record<string, DemoPerms> = {};
  for (const [userId, raw] of Object.entries(rawPerms)) accountPerms[userId] = parseDemoPerms(raw);
  return { demo, demoLimit, accountLimits, accountPerms };
}

/** DemoSettings → Tenant.settings(JSON). 전체 필드 보존(부분 쓰기로 한도/권한 유실 방지). */
export function serializeDemoSettings(s: DemoSettings): Prisma.InputJsonValue {
  return {
    demo: true,
    demoLimit: s.demoLimit,
    accountLimits: s.accountLimits,
    accountPerms: s.accountPerms,
  } as unknown as Prisma.InputJsonValue;
}

/** 계정 한도 = override 우선, 없으면 기본 demoLimit. */
export function resolveAccountLimit(settings: unknown, userId: string): number {
  const { demoLimit, accountLimits } = parseDemoSettings(settings);
  return accountLimits[userId] ?? demoLimit;
}

/** 계정 권한 = override 우선, 없으면 전체 허용. */
export function resolveAccountPerms(settings: unknown, userId: string): DemoPerms {
  const { accountPerms } = parseDemoSettings(settings);
  return accountPerms[userId] ?? { ...DEFAULT_DEMO_PERMS };
}

/**
 * 데모 전용 지점을 보장(없으면 생성)하고 반환.
 * 데모 계정이 Pro 기능(AI 총평·블로그·주변비교)을 체험하도록 데모 지점을 **Pro 플랜으로 고정**한다.
 * 분석 횟수는 별도 데모 게이트(평생 N회)가 제한하므로 Pro 월 쿼터(35)는 영향 없다.
 */
export async function ensureDemoTenant() {
  let tenant = await prisma.tenant.findUnique({ where: { slug: DEMO_TENANT_SLUG } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        slug: DEMO_TENANT_SLUG,
        name: DEMO_TENANT_NAME,
        settings: { demo: true, demoLimit: DEFAULT_DEMO_LIMIT, accountLimits: {}, accountPerms: {} },
      },
    });
  }
  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, plan: 'pro', status: 'active', currentPeriodEnd: null },
    update: { plan: 'pro', status: 'active', currentPeriodEnd: null },
  });
  return tenant;
}

export interface DemoContext {
  isDemo: boolean;
  limit: number;
  perms: DemoPerms;
}

/** 유저가 데모 지점 소속인지 + 그 계정의 한도·권한. */
export async function getDemoContext(user: { id: string; tenantId: string | null }): Promise<DemoContext> {
  if (!user.tenantId) return { isDemo: false, limit: 0, perms: { ...DEFAULT_DEMO_PERMS } };
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { settings: true },
  });
  const parsed = parseDemoSettings(tenant?.settings);
  if (!parsed.demo) return { isDemo: false, limit: 0, perms: { ...DEFAULT_DEMO_PERMS } };
  return {
    isDemo: true,
    limit: parsed.accountLimits[user.id] ?? parsed.demoLimit,
    perms: parsed.accountPerms[user.id] ?? { ...DEFAULT_DEMO_PERMS },
  };
}

/**
 * 데모 계정 사용량 = 분석 완료(COMPLETED) + 진행 중(ANALYZING) 시험지 수(현재 시험지 제외).
 * 진행 중(in-flight)도 세는 이유: 분석은 최대 3분 걸리고 COMPLETED 반영이 그 뒤라, 완료만 세면
 * 서로 다른 시험지를 빠르게 연달아 제출할 때 한도가 새기 쉽다. ANALYZING 을 포함해 in-flight 를
 * 소비로 취급한다(재분석은 현재 시험지 제외라 소비 아님). 실패(FAILED)·미분석(PENDING)은 미포함.
 * 잔여 한계: 게이트가 status 를 ANALYZING 으로 바꾸기 전(거의 동시 제출)의 경합 창은 남는다 —
 * 기존 billing 월쿼터(getMonthlyAnalysisCount)와 같은 수준으로 수용(superadmin 발급 계정·비용 유계).
 */
export async function countDemoUsage(userId: string, excludeExamPaperId?: string): Promise<number> {
  return prisma.examPaper.count({
    where: {
      teacherId: userId,
      status: { in: ['ANALYZING', 'COMPLETED'] },
      ...(excludeExamPaperId ? { id: { not: excludeExamPaperId } } : {}),
    },
  });
}

/**
 * 데모 한도 게이트.
 * - 데모 계정 아님 → { handled: false }(호출측이 일반 게이트 진행)
 * - 데모 + 한도 초과 → { handled: true, response: 403 DEMO_LIMIT_REACHED }
 * - 데모 + 통과 → { handled: true, response: null }(일반 월 쿼터/크레딧 게이트 건너뜀)
 */
export async function assertDemoAnalysisLimit(
  user: { id: string; tenantId: string | null },
  examPaperId: string,
): Promise<{ handled: boolean; response: NextResponse | null }> {
  const ctx = await getDemoContext(user);
  if (!ctx.isDemo) return { handled: false, response: null };
  if (!ctx.perms.analyze) {
    return {
      handled: true,
      response: NextResponse.json(
        { error: { code: 'DEMO_FEATURE_DENIED', message: '이 데모 계정은 기출분석 체험 권한이 없습니다. 관리자에게 문의하세요.' } },
        { status: 403 },
      ),
    };
  }
  const used = await countDemoUsage(user.id, examPaperId);
  if (used >= ctx.limit) {
    return {
      handled: true,
      response: NextResponse.json(
        {
          error: {
            code: 'DEMO_LIMIT_REACHED',
            message: `데모 체험 횟수(${ctx.limit}회)를 모두 사용했습니다. 정식 도입 문의를 통해 계속 이용하실 수 있습니다.`,
          },
        },
        { status: 403 },
      ),
    };
  }
  return { handled: true, response: null };
}

/**
 * 데모 계정의 기능별 체험 권한 게이트(commentary | blog).
 * 비-데모 → { handled: false }(호출측 기존 게이트 진행). 데모+권한없음 → 403. 데모+허용 → { handled: true, null }.
 */
export async function assertDemoFeature(
  user: { id: string; tenantId: string | null },
  feature: 'commentary' | 'blog',
): Promise<{ handled: boolean; response: NextResponse | null }> {
  const ctx = await getDemoContext(user);
  if (!ctx.isDemo) return { handled: false, response: null };
  if (!ctx.perms[feature]) {
    const label = feature === 'commentary' ? 'AI 총평' : '블로그 글·복사';
    return {
      handled: true,
      response: NextResponse.json(
        { error: { code: 'DEMO_FEATURE_DENIED', message: `이 데모 계정은 ${label} 체험 권한이 없습니다. 관리자에게 문의하세요.` } },
        { status: 403 },
      ),
    };
  }
  return { handled: true, response: null };
}
