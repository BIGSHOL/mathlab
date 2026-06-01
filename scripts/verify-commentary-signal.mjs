/**
 * 총평 "이 시험만의 특이 신호" 데이터 신호 검증 — buildV3UserPrompt 로직 복제.
 * AI 호출 없이, 입력 프롬프트가 실제로 무엇을 AI에 알려주는지 확인.
 * 실행: node --env-file=.env.local scripts/verify-commentary-signal.mjs
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const dMap = { concept: '1', pattern: '2', reasoning: '4', creative: '5' };
const leafSeg = (t) => { const p = String(t || '미분류').split('>').map((s) => s.trim()); return p[p.length - 1] || '미분류'; };
const parentSeg = (t) => { const p = String(t || '미분류').split('>').map((s) => s.trim()); return (p.length >= 2 ? p[p.length - 2] : p[p.length - 1]) || '미분류'; };
const levelOf = (q) => Number(dMap[String(q.difficulty ?? '3')] || String(q.difficulty ?? '3')) || 0;

const analyses = await prisma.examAnalysis.findMany({
  select: { questions: true, examPaper: { select: { schoolName: true, grade: true } } },
  orderBy: { createdAt: 'desc' },
});

for (const a of analyses) {
  const qs = Array.isArray(a.questions) ? a.questions : [];
  if (!qs.length) continue;
  const totalPts = qs.reduce((s, q) => s + (q.points || 0), 0);

  // topicBreakdown (배점 기준)
  const topicStats = {};
  for (const q of qs) { const t = leafSeg(q.topic); (topicStats[t] ??= { pts: 0 }).pts += q.points || 0; }
  const topicBreakdown = Object.entries(topicStats).map(([topic, s]) => ({ topic, pts: s.pts }));

  const essayQs = qs.filter((q) => q.question_format === 'essay');
  const essayPts = essayQs.reduce((s, q) => s + (q.points || 0), 0);
  const essayPct = totalPts > 0 ? Math.round((essayPts / totalPts) * 100) : 0;
  const essayClass = essayQs.length === 0 ? '서술형 없음'
    : essayPct >= 41 ? `${essayPts}점(${essayPct}%) — 표준(~1/3)보다 높음 → 특징 후보`
    : essayPct <= 25 ? `${essayPts}점(${essayPct}%) — 표준보다 낮음 → 특징 후보`
    : `${essayPts}점(${essayPct}%) — 표준(~1/3) 수준 → 헤드라인 금지(상식)`;
  const essayLeafLine = essayQs.length ? [...new Set(essayQs.map((q) => leafSeg(q.topic)))].join(', ') : '없음';
  const essayParentPts = {};
  for (const q of essayQs) { const t = parentSeg(q.topic); essayParentPts[t] = (essayParentPts[t] || 0) + (q.points || 0); }
  const essayParentTop = Object.entries(essayParentPts).sort((x, y) => y[1] - x[1])[0];
  const essayCluster = essayQs.length >= 2 && essayParentTop && essayPts > 0 && essayParentTop[1] / essayPts >= 0.6
    ? `⚠️ 쏠림: 서술형 배점의 ${Math.round((essayParentTop[1] / essayPts) * 100)}%가 '${essayParentTop[0]}' 영역에 집중` : '(분산)';
  const killerQs = qs.filter((q) => levelOf(q) >= 4);
  const killerCnt = {};
  for (const q of killerQs) { const t = parentSeg(q.topic); killerCnt[t] = (killerCnt[t] || 0) + 1; }
  const killerTop = Object.entries(killerCnt).sort((x, y) => y[1] - x[1])[0];
  const killerCluster = killerQs.length >= 2 && killerTop && killerTop[1] / killerQs.length >= 0.6
    ? `⚠️ 킬러 ${killerQs.length}개 중 ${killerTop[1]}개가 '${killerTop[0]}'에 집중` : '여러 단원 분산';
  const topByPts = [...topicBreakdown].sort((x, y) => y.pts - x.pts)[0];
  const topPtsPct = topByPts && totalPts > 0 ? Math.round((topByPts.pts / totalPts) * 100) : 0;
  const topConcentration = topByPts && topPtsPct >= 40 ? `⚠️ '${topByPts.topic}' 한 단원이 배점 ${topPtsPct}% 독식` : '';

  console.log(`\n══ ${a.examPaper?.schoolName} ${a.examPaper?.grade} (총 ${totalPts}점) ══`);
  console.log(`- 서술형 배점: ${essayClass}`);
  console.log(`- 서술형 출제 단원: ${essayLeafLine}\n    ${essayCluster}`);
  console.log(`- 킬러(Lv4~5) ${killerQs.length}문항: ${killerCluster}`);
  console.log(`- 배점 최다 단원: ${topByPts ? `${topByPts.topic} ${topPtsPct}%` : '없음'}${topConcentration ? `  ${topConcentration}` : ''}`);
}
console.log('');
await prisma.$disconnect();
