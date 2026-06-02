/**
 * 시험지 분석본 문항별 난이도 + AI 사유 점검 (재사용 — 학교명 인자).
 * 실행: node --env-file=.env.local scripts/inspect-exam-difficulty.mjs 제일
 *       node --env-file=.env.local scripts/inspect-exam-difficulty.mjs            (전체)
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const filter = process.argv[2] || '';
const LEVEL_MAP = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, concept: 1, pattern: 2, reasoning: 4, creative: 5 };
const LABELS = { 1: '기본', 2: '표준', 3: '응용', 4: '심화', 5: '최고난도' };
const FMT = { multiple_choice: '객관식', objective: '객관식', short_answer: '단답형', essay: '서술형' };
const W = { 1: 1, 2: 1, 3: 2, 4: 5, 5: 10 };

const papers = await prisma.examPaper.findMany({
  where: filter ? { schoolName: { contains: filter } } : {},
  select: {
    id: true, title: true, schoolName: true, grade: true, schoolId: true,
    analyses: { select: { id: true, questions: true, modelVersion: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
  },
  orderBy: { createdAt: 'desc' },
});
if (!papers.length) { console.log(`"${filter}" 시험지 없음`); await prisma.$disconnect(); process.exit(0); }

for (const p of papers) {
  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`📄 ${p.title}`);
  console.log(`   schoolName="${p.schoolName}" grade=${p.grade} schoolId=${p.schoolId ?? 'null(미연결)'}`);
  const a = p.analyses?.[0];
  if (!a) { console.log('   ⚠️ 분석본 없음'); continue; }
  const qs = Array.isArray(a.questions) ? a.questions : [];
  console.log(`   분석본 ${a.id} · ${qs.length}문항 · ${a.modelVersion ?? '?'}`);

  const lvls = [], pts = [];
  let edited = 0;
  console.log(`\n   #     유형        형식    배점  난이도          단원                사유`);
  console.log(`   ──────────────────────────────────────────────────────────────────────────`);
  for (const q of qs) {
    const L = LEVEL_MAP[String(q.difficulty)] ?? 0; lvls.push(L); pts.push(Number(q.points) || 0);
    if (q.manually_edited) edited++;
    const num = String(q.question_number ?? '?').padEnd(5);
    const type = String(q.question_type ?? '?').padEnd(10);
    const fmt = (FMT[q.question_format] ?? q.question_format ?? '?').padEnd(6);
    const pt = String(q.points ?? '?').padStart(4);
    const diff = `${L}(${LABELS[L] ?? '?'})`.padEnd(11);
    const ai = q.ai_difficulty != null ? ` [AI원본:${q.ai_difficulty}]` : '';
    const topic = (String(q.topic ?? '?').split('>').pop()?.trim() ?? '?').padEnd(16);
    const reason = q.difficulty_reason ?? '';
    console.log(`   ${num} ${type} ${fmt} ${pt}  ${diff}${ai ? ai.padEnd(14) : ''.padEnd(0)} ${topic} ${reason}`);
  }

  let num = 0, den = 0, sNum = 0, sDen = 0;
  for (let i = 0; i < lvls.length; i++) { const L = lvls[i], pt = pts[i]; if (!L) continue; num += W[L] * pt * L; den += W[L] * pt; sNum += pt * L; sDen += pt; }
  const wAvg = den > 0 ? num / den : 0, sAvg = sDen > 0 ? sNum / sDen : 0;
  const dist = [1, 2, 3, 4, 5].map((l) => lvls.filter((x) => x === l).length).join('/');
  const totalPts = pts.reduce((s, x) => s + x, 0);
  console.log(`\n   분포 [기본/표준/응용/심화/최고] = ${dist}  (총 ${totalPts}점, ${qs.length}문항)`);
  console.log(`   배점단순평균 ${sAvg.toFixed(2)}  →  영향력가중평균(종합 표시) ${wAvg.toFixed(2)} (${LABELS[Math.round(wAvg)] ?? '?'})`);
  console.log(`   수동 교정: ${edited}건`);
}
console.log('');
await prisma.$disconnect();
