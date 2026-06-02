/**
 * 분석본 인벤토리 — 학교별 분석본 개수/생성시각/교정상태. 중복 탐지용.
 * 실행: node --env-file=.env.local scripts/inventory-analyses.mjs
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const rows = await prisma.examAnalysis.findMany({
  select: {
    id: true, createdAt: true, questions: true,
    examPaper: { select: { schoolName: true, title: true } },
  },
  orderBy: { createdAt: 'asc' },
});

const bySchool = {};
for (const a of rows) {
  const s = a.examPaper?.schoolName ?? '?';
  const qs = Array.isArray(a.questions) ? a.questions : [];
  const edited = qs.filter((q) => q.manually_edited).length;
  const aidiff = qs.filter((q) => q.ai_difficulty != null).length;
  (bySchool[s] ??= []).push({ id: a.id, at: a.createdAt, n: qs.length, edited, aidiff });
}

console.log(`\n총 분석본 ${rows.length}개 · 학교 ${Object.keys(bySchool).length}개\n`);
let dupes = 0;
for (const [s, list] of Object.entries(bySchool).sort()) {
  const mark = list.length > 1 ? ` ⚠️ 중복 ${list.length}개` : '';
  if (list.length > 1) dupes++;
  console.log(`${s}${mark}`);
  for (const x of list) {
    const ts = x.at instanceof Date ? x.at.toISOString().slice(0, 19).replace('T', ' ') : String(x.at);
    console.log(`   ${x.id}  ${ts}  ${x.n}문항  교정 ${x.edited}  ai_diff보존 ${x.aidiff}`);
  }
}
console.log(`\n중복 학교: ${dupes}개`);
console.log('');
await prisma.$disconnect();
