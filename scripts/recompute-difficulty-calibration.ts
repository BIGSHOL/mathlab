/**
 * 보정 맵 재계산 (CLI) — 전 필드(난이도·배점·단원·유형·능력) → MetadataCalibration upsert.
 *
 * 사용법: npx tsx scripts/recompute-difficulty-calibration.ts
 *
 * 전국 절대 기준 → 플랫폼 전역(테넌트 무관) 집계. API recompute 라우트와 동일 로직(공유 헬퍼).
 */

import { PrismaClient } from '@prisma/client';
import { recomputeCalibrations } from '../src/lib/exam-analysis/calibration-recompute';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 통합 보정 맵 재계산 (전 필드)...\n');
  const summary = await recomputeCalibrations(prisma, new Date().toISOString());

  console.log(`  분석 문항: ${summary.totalAnalyzedQuestions}개\n`);
  console.log('  [수치형]');
  for (const [field, s] of Object.entries(summary.numeric)) {
    console.log(`    ${field.padEnd(12)} 편향 ${s.globalBias >= 0 ? '+' : ''}${s.globalBias} · 적용버킷 ${s.appliedBuckets} · 표본 ${s.totalCorrections}`);
  }
  console.log('  [범주형]');
  for (const [field, s] of Object.entries(summary.categorical)) {
    console.log(`    ${field.padEnd(12)} 혼동그룹 ${s.groups} · 표본 ${s.totalCorrections}`);
  }
  console.log('\n✅ MetadataCalibration 전 필드 갱신 완료');
}

main()
  .catch((e) => { console.error('❌ 실패:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
