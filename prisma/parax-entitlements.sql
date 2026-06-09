-- ============================================================
--  Para-X 이용권 시스템 — mathlab 스키마 추가분 (Phase 2)
--  적용: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.
--
--  ⚠️ 추가형(비파괴적)입니다. 기존 테이블/데이터를 건드리지 않습니다.
--  ⚠️ mathlab 은 마이그레이션 히스토리와 실제 DB 가 어긋나 있어(드리프트),
--     `prisma migrate dev` 를 쓰지 않고 이 SQL + `prisma generate` 로 반영합니다.
--  명명·타입은 Prisma 가 생성하는 DDL 과 일치(기존 "LicenseFeature" enum 재사용).
--  여러 번 실행해도 안전(IF NOT EXISTS).
-- ============================================================

-- 1) 지점 이용권 풀 ─ para-x 결제로 충전
CREATE TABLE IF NOT EXISTS "TenantEntitlement" (
  "id"             TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "feature"        "LicenseFeature" NOT NULL,
  "balance"        INTEGER NOT NULL DEFAULT 0,
  "totalPurchased" INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantEntitlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantEntitlement_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantEntitlement_tenantId_feature_key"
  ON "TenantEntitlement"("tenantId", "feature");
CREATE INDEX IF NOT EXISTS "TenantEntitlement_tenantId_idx"
  ON "TenantEntitlement"("tenantId");

-- 2) 학생 개별 배정 ─ 지점 풀 → 학생 (소비는 Phase 3)
CREATE TABLE IF NOT EXISTS "StudentLicense" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "feature"   "LicenseFeature" NOT NULL,
  "allocated" INTEGER NOT NULL DEFAULT 0,
  "used"      INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentLicense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentLicense_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudentLicense_tenantId_userId_feature_key"
  ON "StudentLicense"("tenantId", "userId", "feature");
CREATE INDEX IF NOT EXISTS "StudentLicense_tenantId_idx" ON "StudentLicense"("tenantId");
CREATE INDEX IF NOT EXISTS "StudentLicense_userId_idx" ON "StudentLicense"("userId");

-- 3) 거래 원장 ─ 감사 + 멱등(refOrderId 주문당 1행)
CREATE TABLE IF NOT EXISTS "EntitlementLedger" (
  "id"         TEXT NOT NULL,
  "tenantId"   TEXT NOT NULL,
  "userId"     TEXT,
  "feature"    "LicenseFeature",
  "delta"      INTEGER NOT NULL,
  "reason"     VARCHAR(20) NOT NULL,
  "refOrderId" TEXT,
  "amount"     INTEGER,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntitlementLedger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EntitlementLedger_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- refOrderId 유니크 = 같은 주문이 두 번 적립되지 않도록(멱등). NULL 은 여러 개 허용(배정/소비).
CREATE UNIQUE INDEX IF NOT EXISTS "EntitlementLedger_refOrderId_key"
  ON "EntitlementLedger"("refOrderId");
CREATE INDEX IF NOT EXISTS "EntitlementLedger_tenantId_createdAt_idx"
  ON "EntitlementLedger"("tenantId", "createdAt");

-- 4) TenantSubscription 토스 컬럼 (Phase 4용, nullable)
ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "tossBillingKey"     VARCHAR(200);
ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "tossCustomerKey"    VARCHAR(100);
ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "tossSubscriptionId" VARCHAR(100);
