/**
 * 난이도 보정 통합 랩 — 교사 ground truth(라벨+출처) 누적 + 적용 + 분석.
 *
 *   node --env-file=.env.local scripts/calibration-lab.mjs            # 분석(기본): type:level vs 출처 수렴 비교
 *   node --env-file=.env.local scripts/calibration-lab.mjs apply 칠성  # 특정 학교 교정 DB 적용
 *   node --env-file=.env.local scripts/calibration-lab.mjs apply all   # 전체 적용(idempotent)
 *
 * 새 시험 추가: GT 객체에 { labels, sources } 한 줄 추가 (DB 문항 순서대로).
 * 라벨 스케일: 하1·중하2·중3·중상4·상4·최상5·최고난도5.  출처: 교과서/시중/모의/자체.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const LABEL_MAP = { '하': 1, '중하': 2, '중': 3, '중상': 4, '상': 4, '최상': 5, '최고난도': 5 };
const LEVEL_MAP = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, concept: 1, pattern: 2, reasoning: 4, creative: 5 };
const LABELS = { 1: '기본', 2: '표준', 3: '응용', 4: '심화', 5: '최고난도' };
const W = { 1: 1, 2: 1, 3: 2, 4: 5, 5: 10 };

// ── 교사 ground truth (DB 문항 순서대로) ──
const GT = {
  '경상고': {
    labels: ['하','하','하','중하','중','중','중','상','상','상','상','중','상','중','상','최고난도','최고난도'],
    sources: ['교과서','교과서','교과서','교과서','자체','자체','자체','모의','모의','모의','모의','자체','시중','시중','모의','시중','시중'],
  },
  '제일': {
    labels: ['하','하','하','하','중하','중','중','중','중','중상','상','중','상','하','중하','중','중하','중상','중상','최상'],
    sources: ['교과서','교과서','교과서','교과서','시중','시중','시중','시중','시중','모의','시중','시중','모의','교과서','시중','시중','교과서','시중','시중','모의'],
  },
  '신명': {
    labels: ['하','하','하','하','중하','중하','중','중','중','중','중상','중상','중상','중상','상','상','중상','중상','상','최상'],
    sources: ['교과서','교과서','교과서','교과서','시중','시중','시중','시중','모의','시중','시중','모의','시중','시중','모의','모의','모의','시중','시중','모의'],
  },
  '칠성': {
    labels: ['하','하','하','중하','하','하','중하','중','중','중','중상','상','중상','상','상','중상','최상','최상','하','중하','중상','중','상','최상'],
    sources: ['교과서','교과서','교과서','시중','교과서','교과서','시중','시중','시중','시중','모의','모의','시중','모의','모의','시중','모의','모의','교과서','시중','시중','모의','모의','모의'],
  },
  '영진': {
    labels: ['하','하','하','중하','중하','중하','중','중상','중상','중','중상','중상','상','상','최상','중','상','상','상','상'],
    sources: ['교과서','교과서','교과서','교과서','시중','시중','시중','모의','교과서','시중','시중','시중','모의','모의','모의','교과서','모의','시중','모의','모의'],
  },
  '경명': {
    labels: ['하','하','하','중하','하','중하','중','중','중상','중','중상','중상','중상','상','상','중','중하','중상','상','최상'],
    sources: ['교과서','교과서','교과서','교과서','교과서','시중','모의','시중','시중','시중','시중','시중','모의','EBS','모의','교과서','교과서','시중','모의','모의'],
  },
  '성광': {
    labels: ['하','하','중하','중하','하','중하','중','중하','중상','중','중하','중상','중','상','상','상','최상','상','최상','중','상','최상'],
    sources: ['교과서','교과서','시중','시중','교과서','시중','시중','시중','시중','시중','시중','모의','모의','모의','모의','모의','모의','교과서','모의','시중','시중','모의'],
  },
  '성화': {
    labels: ['하','하','하','하','하','중하','중','중','중하','중하','중하','중','중상','중상','상','상','상','최상','상','최상','중','중상','최상'],
    sources: ['교과서','교과서','교과서','교과서','교과서','시중','시중','시중','시중','시중','시중','시중','모의','모의','시중','모의','모의','모의','모의','모의','시중','모의','모의'],
  },
  '경상여': {
    labels: ['하','하','하','하','중하','중하','중하','중하','중','중','중','상','중하','중하','중하','중','중상','중상'],
    sources: ['교과서','교과서','교과서','교과서','시중','시중','시중','시중','시중','모의','모의','모의','교과서','교과서','교과서','시중','모의','모의'],
  },
};

const toLevel = (r) => LEVEL_MAP[String(r)] ?? 0;
const mean = (xs) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
const std = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const consistency = (ds) => { const nz = ds.filter((d) => d !== 0); if (!nz.length) return 0; const pos = nz.filter((d) => d > 0).length; return Math.max(pos, nz.length - pos) / nz.length; };
const round1 = (x) => Math.round(x * 10) / 10;
const gtKeyOf = (school) => Object.keys(GT).find((k) => (school || '').includes(k));

async function loadExam(key) {
  return prisma.examAnalysis.findFirst({
    where: { examPaper: { schoolName: { contains: key } } },
    select: { id: true, questions: true, examPaper: { select: { schoolName: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function apply(which) {
  const keys = which === 'all' ? Object.keys(GT) : [gtKeyOf(which) ?? which];
  for (const key of keys) {
    const a = await loadExam(key);
    if (!a) { console.log(`  ⚠️ "${key}" 분석본 없음`); continue; }
    const qs = Array.isArray(a.questions) ? [...a.questions] : [];
    const teacher = GT[key].labels.map((l) => LABEL_MAP[l]);
    if (qs.length !== teacher.length) { console.log(`  ⚠️ ${key}: 문항 수 ${qs.length} vs GT ${teacher.length} — 건너뜀`); continue; }
    const nowIso = new Date().toISOString();
    let n = 0;
    for (let i = 0; i < qs.length; i++) {
      const q = { ...qs[i] }; const cur = toLevel(q.difficulty); const t = teacher[i];
      if (!t || t === cur) { qs[i] = q; continue; }
      if (q.ai_difficulty == null) q.ai_difficulty = q.difficulty ?? null;
      q.difficulty = String(t); q.manually_edited = true; q.manually_edited_at = nowIso; qs[i] = q; n++;
    }
    await prisma.examAnalysis.update({ where: { id: a.id }, data: { questions: qs } });
    console.log(`  ✅ ${a.examPaper.schoolName}: ${n}건 교정 적용`);
  }
}

async function analyze() {
  const raw = await prisma.examAnalysis.findMany({
    select: { id: true, createdAt: true, questions: true, examPaper: { select: { schoolName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  // 학교별 최신 분석본 1개만 (중복 업로드 dedup)
  const seen = new Set();
  const analyses = raw.filter((a) => { const s = a.examPaper?.schoolName; if (!s || seen.has(s)) return false; seen.add(s); return true; });
  const pairs = []; // {ai,t,d,bucket,source,school}
  const all = [];   // {ai,t,source} (전 문항, 출처별 분포용)
  const perSchool = {};
  for (const a of analyses) {
    const key = gtKeyOf(a.examPaper?.schoolName);
    const qs = Array.isArray(a.questions) ? a.questions : [];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const aiLvl = toLevel(q.ai_difficulty ?? q.difficulty);
      const tLvl = toLevel(q.difficulty);
      const source = key ? GT[key].sources[i] : null;
      if (aiLvl && tLvl) all.push({ ai: aiLvl, t: tLvl, source });
      if (q.ai_difficulty == null) continue;
      if (!aiLvl || !tLvl || aiLvl === tLvl) continue;
      const type = typeof q.question_type === 'string' ? q.question_type : 'unknown';
      pairs.push({ ai: aiLvl, t: tLvl, d: tLvl - aiLvl, bucket: `${type}:${aiLvl}`, source, school: a.examPaper?.schoolName });
      (perSchool[a.examPaper?.schoolName ?? '?'] ??= []).push(tLvl - aiLvl);
    }
  }

  console.log(`\n══ 누적: ${analyses.length}개 분석본 · 교정쌍 ${pairs.length}건 ══`);
  for (const [s, ds] of Object.entries(perSchool)) console.log(`   ${s.padEnd(10)} ${String(ds.length).padStart(2)}건  Δ평균 ${mean(ds) >= 0 ? '+' : ''}${mean(ds).toFixed(2)}`);
  const gb = round1(mean(pairs.map((p) => p.d)));
  console.log(`   전역 편향 ${mean(pairs.map((p) => p.d)).toFixed(3)} → ${gb}  효과: ${[1,2,3,4,5].map((L) => `${L}→${Math.max(1, Math.min(5, Math.round(L + Math.max(-1.5, Math.min(1.5, gb)))))}`).join(' ')}`);

  // ── type:level 버킷 ──
  console.log(`\n── ① type:level 버킷 (현 설계) ──`);
  const byB = {}; for (const p of pairs) (byB[p.bucket] ??= []).push(p.d);
  for (const [b, ds] of Object.entries(byB).sort((x, y) => y[1].length - x[1].length)) {
    const md = mean(ds), c = consistency(ds);
    const ok = ds.length >= 5 && c >= 0.7 && Math.abs(md) >= 0.5;
    console.log(`   ${b.padEnd(13)} N=${String(ds.length).padStart(2)} Δ${md >= 0 ? '+' : ''}${md.toFixed(2)} 일관${(c * 100).toFixed(0)}% ${ok ? '✅' : '❌'}`);
  }

  // ── 출처별 난이도 분포 ──
  console.log(`\n── ② 출처별 난이도: 교사 vs AI (전 문항) ──`);
  for (const src of ['교과서', '시중', '모의', 'EBS', '자체']) {
    const rows = all.filter((r) => r.source === src); if (!rows.length) continue;
    const t = rows.map((r) => r.t), ai = rows.map((r) => r.ai);
    console.log(`   ${src.padEnd(4)} N=${String(rows.length).padStart(2)}  교사 ${mean(t).toFixed(2)}(±${std(t).toFixed(2)})  AI ${mean(ai).toFixed(2)}(±${std(ai).toFixed(2)})`);
  }

  // ── 출처 버킷 (수렴?) ──
  console.log(`\n── ③ 출처 버킷 보정 (대안 설계) ──`);
  for (const src of ['교과서', '시중', '모의', 'EBS', '자체']) {
    const ds = pairs.filter((p) => p.source === src).map((p) => p.d); if (!ds.length) continue;
    const md = mean(ds), c = consistency(ds);
    const ok = ds.length >= 5 && c >= 0.7 && Math.abs(md) >= 0.5;
    console.log(`   ${src.padEnd(4)} N=${String(ds.length).padStart(2)} Δ${md >= 0 ? '+' : ''}${md.toFixed(2)} 일관${(c * 100).toFixed(0)}% ${ok ? '✅ 수렴' : (c >= 0.7 ? '~경향' : '✗')}`);
  }
  console.log('');
}

// ── 보정 맵 빌드/적용 (calibration.ts 게이트 복제) ──
function buildNumMap(pairs) { // pairs: {ai,t,key}
  const byB = {};
  for (const p of pairs) (byB[p.key] ??= []).push(p.t - p.ai);
  const bs = {};
  for (const [k, ds] of Object.entries(byB))
    if (ds.length >= 5 && consistency(ds) >= 0.7 && Math.abs(mean(ds)) >= 0.5) bs[k] = round1(mean(ds));
  const gb = pairs.length >= 5 ? round1(mean(pairs.map((p) => p.t - p.ai))) : 0;
  return { bs, gb };
}
function applyNum(ai, key, map) {
  const shift = (key in map.bs) ? map.bs[key] : map.gb;
  const capped = Math.max(-1.5, Math.min(1.5, shift));
  return Math.max(1, Math.min(5, Math.round(ai + capped)));
}

async function sim() {
  const raw = await prisma.examAnalysis.findMany({
    select: { id: true, createdAt: true, questions: true, examPaper: { select: { schoolName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const seen = new Set();
  const analyses = raw.filter((a) => { const s = a.examPaper?.schoolName; if (!s || seen.has(s)) return false; seen.add(s); return true; });

  const data = []; // GT 있는 학교의 전 문항 {school, ai(원본), t(교사), type, source}
  for (const a of analyses) {
    const key = gtKeyOf(a.examPaper?.schoolName);
    if (!key) continue;
    const qs = Array.isArray(a.questions) ? a.questions : [];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const ai = toLevel(q.ai_difficulty ?? q.difficulty);
      const t = toLevel(q.difficulty);
      if (!ai || !t) continue;
      data.push({ school: key, ai, t, type: (typeof q.question_type === 'string' ? q.question_type : 'unknown'), source: GT[key].sources[i], points: Number(q.points) || 0 });
    }
  }
  const mean2 = (xs) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
  const schools = [...new Set(data.map((d) => d.school))];

  function cv(keyFn) { // leave-one-school-out
    const preds = [];
    for (const S of schools) {
      const train = data.filter((d) => d.school !== S && d.ai !== d.t).map((d) => ({ ai: d.ai, t: d.t, key: keyFn(d) }));
      const map = buildNumMap(train);
      for (const d of data.filter((d) => d.school === S)) preds.push({ d, pred: applyNum(d.ai, keyFn(d), map) });
    }
    return preds;
  }
  const summ = (preds) => {
    let better = 0, worse = 0, same = 0;
    for (const p of preds) { const b0 = Math.abs(p.d.ai - p.d.t), b1 = Math.abs(p.pred - p.d.t); if (b1 < b0) better++; else if (b1 > b0) worse++; else same++; }
    return { mae: mean2(preds.map((p) => Math.abs(p.pred - p.d.t))), acc: preds.filter((p) => p.pred === p.d.t).length / preds.length, better, worse, same };
  };
  const baseMae = mean2(data.map((d) => Math.abs(d.ai - d.t)));
  const baseAcc = data.filter((d) => d.ai === d.t).length / data.length;
  const tlP = cv((d) => `${d.type}:${d.ai}`), srcP = cv((d) => d.source ?? 'unknown');
  const tl = summ(tlP), src = summ(srcP);

  console.log(`\n══ 보정 효과 — leave-one-school-out 교차검증 (GT ${schools.length}개교 · ${data.length}문항) ══`);
  console.log(`   MAE=평균절대오차(↓좋음), 정확도=교사난이도 정확 일치, 개선/악화=baseline 대비 문항\n`);
  console.log(`   ① 보정 없음          MAE ${baseMae.toFixed(3)}  정확도 ${(baseAcc * 100).toFixed(1)}%`);
  console.log(`   ② type:level (출처✗)  MAE ${tl.mae.toFixed(3)}  정확도 ${(tl.acc * 100).toFixed(1)}%   개선 ${tl.better} · 악화 ${tl.worse} · 동일 ${tl.same}`);
  console.log(`   ③ 출처 보정          MAE ${src.mae.toFixed(3)}  정확도 ${(src.acc * 100).toFixed(1)}%   개선 ${src.better} · 악화 ${src.worse} · 동일 ${src.same}`);

  // 종합 난이도(카드, 배점 영향력 가중평균) — 학교별 |예측 종합 − 교사 종합| 평균 (CV)
  const aggMAE = (rows, predOf) => {
    const by = {};
    for (const r of rows) (by[r.school] ??= []).push(r);
    const errs = [];
    for (const ps of Object.values(by)) {
      const wa = (lvOf) => { let n = 0, d = 0; for (const r of ps) { const L = lvOf(r), w = W[L] || 1; n += w * r.points * L; d += w * r.points; } return d ? n / d : 0; };
      errs.push(Math.abs(wa(predOf) - wa((r) => r.t)));
    }
    return mean2(errs);
  };
  const aggBase = aggMAE(data, (r) => r.ai);
  const aggTL = aggMAE(tlP.map((p) => ({ school: p.d.school, points: p.d.points, t: p.d.t, pred: p.pred })), (r) => r.pred);
  const aggSrc = aggMAE(srcP.map((p) => ({ school: p.d.school, points: p.d.points, t: p.d.t, pred: p.pred })), (r) => r.pred);
  console.log(`\n   종합 난이도(카드) 오차 — 학교별 |예측 − 교사| 평균 (↓좋음):`);
  console.log(`     ① 보정없음 ${aggBase.toFixed(3)}   ② type:level ${aggTL.toFixed(3)}   ③ 출처 ${aggSrc.toFixed(3)}`);

  const fullTL = buildNumMap(data.filter((d) => d.ai !== d.t).map((d) => ({ ai: d.ai, t: d.t, key: `${d.type}:${d.ai}` })));
  const fullSrc = buildNumMap(data.filter((d) => d.ai !== d.t).map((d) => ({ ai: d.ai, t: d.t, key: d.source ?? 'unknown' })));
  console.log(`\n   실제 활성화 맵:`);
  console.log(`     type:level → 버킷 ${JSON.stringify(fullTL.bs)} · 전역 ${fullTL.gb}`);
  console.log(`     출처      → 버킷 ${JSON.stringify(fullSrc.bs)} · 전역 ${fullSrc.gb}`);
  console.log('');
}

const [mode, which] = process.argv.slice(2);
if (mode === 'apply') await apply(which ?? 'all');
else if (mode === 'sim') await sim();
else await analyze();
await prisma.$disconnect();
