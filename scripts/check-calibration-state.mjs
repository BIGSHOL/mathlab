/**
 * 현재 보정맵(MetadataCalibration) 상태 + 전 분석본의 기존 교정(manually_edited) 현황.
 * 실행: node --env-file=.env.local scripts/check-calibration-state.mjs
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

console.log('\n── 활성 보정맵 (MetadataCalibration) ──');
let rows = [];
try {
  rows = await prisma.metadataCalibration.findMany();
} catch (e) { console.log('  (테이블 조회 실패: ' + e.message.split('\n')[0] + ')'); }
if (!rows.length) console.log('  (행 없음 — 활성 보정 0)');
for (const r of rows) {
  console.log(`  [${r.subject}/${r.field}] kind=${r.kind} globalBias=${r.globalBias} totalCorrections=${r.totalCorrections}`);
  console.log(`     bucketShifts=${JSON.stringify(r.bucketShifts)}  updatedAt=${r.updatedAt?.toISOString?.() ?? r.updatedAt}`);
}

console.log('\n── 전 분석본의 기존 교정(manually_edited / ai_difficulty) 현황 ──');
const analyses = await prisma.examAnalysis.findMany({
  select: { id: true, questions: true, examPaper: { select: { schoolName: true } } },
});
let totalEdited = 0, totalWithAiDiff = 0;
for (const a of analyses) {
  const qs = Array.isArray(a.questions) ? a.questions : [];
  const edited = qs.filter((q) => q.manually_edited).length;
  const aiDiff = qs.filter((q) => q.ai_difficulty != null).length;
  totalEdited += edited; totalWithAiDiff += aiDiff;
  if (edited || aiDiff) console.log(`  ${a.examPaper?.schoolName ?? '?'}: manually_edited=${edited}, ai_difficulty보존=${aiDiff}`);
}
console.log(`  합계: manually_edited ${totalEdited}건, ai_difficulty 보존 ${totalWithAiDiff}건 (전체 분석본 ${analyses.length}개)`);
console.log('');
await prisma.$disconnect();
