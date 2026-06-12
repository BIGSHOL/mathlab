-- EntitlementCreditLot: 이용권 충전 단위 lot — 약관 제6조(충전일로부터 1년 유효, 경과 시 소멸)
-- userId NULL = 지점 풀 보유분, 값 = 학생 배정분(배정 시 풀 lot 에서 분할, 만료일 승계).
-- 2026-06-12 prisma db push 로 적용 완료 — 본 파일은 DDL 기록용(멱등, 재실행 안전).
CREATE TABLE IF NOT EXISTS "EntitlementCreditLot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "feature" "LicenseFeature" NOT NULL,
    "granted" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refOrderId" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntitlementCreditLot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EntitlementCreditLot_tenantId_feature_expiresAt_idx" ON "EntitlementCreditLot"("tenantId", "feature", "expiresAt");
CREATE INDEX IF NOT EXISTS "EntitlementCreditLot_tenantId_userId_feature_expiresAt_idx" ON "EntitlementCreditLot"("tenantId", "userId", "feature", "expiresAt");

DO $$ BEGIN
  ALTER TABLE "EntitlementCreditLot" ADD CONSTRAINT "EntitlementCreditLot_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
