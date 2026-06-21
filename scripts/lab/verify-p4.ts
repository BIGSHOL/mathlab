/**
 * 🚧 Lab P4 — autoReporter end-to-end 검증 (개발용)
 *   보고를 manual(스냅샷) → auto(결정적 리포트: 학부모/원장 분기 + 직전 대비 성장)로 교체.
 *   검증 축:
 *     [0] 정책 순수함수 — masteryLabel/overallLabel/masteryBucket
 *     [1] DIRECTOR 리포트 — 정확 통계(숙련/학습중/약점 분포·평균)
 *     [2] PARENT 리포트 — 정성 라벨(종합·강점·집중필요), 수치 자제
 *     [3] 성장 — 직전 리포트 snapshot 대비 delta(C3 향상 → grown)
 *     [4] 영속·메타 — LabReport 생성, genMode=AUTO
 *     [5] 결정성 — 같은 mastery → 같은 stats
 *
 *   실행: node --env-file=.env.local --import tsx scripts/lab/verify-p4.ts
 *   전제: seed-synthetic.ts 시드(개념 5·데모학생). 시작 시 데모학생 mastery·report 정리(결정적).
 */
import { prisma } from '@/lib/db';
import { generateLabReport } from '@/lib/lab/service';
import { masteryLabel, overallLabel, masteryBucket } from '@/lib/lab/report-policy';

const SID = 'lab-student-demo';

function line() { console.log('─'.repeat(60)); }
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? '✅' : '❌'} ${label} — ${detail}`);
  return ok;
}

async function clean() {
  await prisma.labReport.deleteMany({ where: { studentId: SID } });
  await prisma.labMasteryRecord.deleteMany({ where: { studentId: SID } });
}

async function setMastery(scores: Record<string, number>) {
  for (const [conceptId, score] of Object.entries(scores)) {
    await prisma.labMasteryRecord.upsert({
      where: { studentId_conceptId: { studentId: SID, conceptId } },
      create: { studentId: SID, conceptId, score, observationCount: 5, lastObservedAt: new Date(), genMode: 'AUTO' },
      update: { score, genMode: 'AUTO' },
    });
  }
}

async function main() {
  let allPass = true;
  line();
  console.log('🚧 Lab P4 autoReporter 검증 — student:', SID);
  line();

  // ── [0] 정책 순수함수
  console.log('\n[0] 보고 정책 순수함수');
  allPass = check('masteryLabel: 0.3→시작, 0.5→발전중, 0.7→양호, 0.9→우수, 0.97→완성',
    masteryLabel(0.3) === '시작 단계' && masteryLabel(0.5) === '발전 중' && masteryLabel(0.7) === '양호' && masteryLabel(0.9) === '우수' && masteryLabel(0.97) === '완성',
    `${[0.3, 0.5, 0.7, 0.9, 0.97].map(masteryLabel).join('·')}`) && allPass;
  allPass = check('overallLabel: 0.65→양호', overallLabel(0.65) === '양호', overallLabel(0.65)) && allPass;
  allPass = check('masteryBucket: 0.9→mastered, 0.7→inProgress, 0.3→weak',
    masteryBucket(0.9) === 'mastered' && masteryBucket(0.7) === 'inProgress' && masteryBucket(0.3) === 'weak', 'ok') && allPass;

  // 알려진 mastery 세팅: C1 강 / C2·C3 약 / C4 강 / C5 학습중
  await clean();
  await setMastery({ 'lab-c1': 0.9, 'lab-c2': 0.5, 'lab-c3': 0.3, 'lab-c4': 0.85, 'lab-c5': 0.7 });
  const period = { start: new Date('2026-06-15'), end: new Date('2026-06-22') };

  // ── [1] DIRECTOR 리포트 — 정확 통계
  console.log('\n[1] DIRECTOR 리포트 — 정확 통계');
  const dir1 = await generateLabReport(SID, 'DIRECTOR', period.start, period.end);
  const ds = (dir1.summary as any).stats;
  allPass = check('통계: 개념 5 / 숙련 2 / 학습중 1 / 약점 2',
    ds.conceptCount === 5 && ds.mastered === 2 && ds.inProgress === 1 && ds.weak === 2,
    `n=${ds.conceptCount} mastered=${ds.mastered} inProgress=${ds.inProgress} weak=${ds.weak}`) && allPass;
  allPass = check('통계: 평균 ≈ 0.65', Math.abs(ds.avgScore - 0.65) < 1e-9, `avg=${ds.avgScore.toFixed(4)}`) && allPass;
  const dWeakNames = ((dir1.summary as any).weakConcepts as Array<{ name: string }>).map((w) => w.name);
  allPass = check('약점 목록: 뺄셈·곱셈 포함(정확 수치 OK)', dWeakNames.includes('자연수의 뺄셈') && dWeakNames.includes('자연수의 곱셈'), dWeakNames.join(', ')) && allPass;

  // ── [2] PARENT 리포트 — 정성 라벨
  console.log('\n[2] PARENT 리포트 — 정성 라벨(수치 자제)');
  const par1 = await generateLabReport(SID, 'PARENT', period.start, period.end);
  const ps = par1.summary as any;
  allPass = check('종합 정성 라벨 = 양호', ps.overall === '양호', `overall=${ps.overall}`) && allPass;
  allPass = check('집중 필요(약점) = 뺄셈·곱셈', ps.focus.includes('자연수의 뺄셈') && ps.focus.includes('자연수의 곱셈'), ps.focus.join(', ')) && allPass;
  allPass = check('강점 = 덧셈·나눗셈', ps.strengths.includes('자연수의 덧셈') && ps.strengths.includes('자연수의 나눗셈'), ps.strengths.join(', ')) && allPass;
  allPass = check('정성 메시지 존재 + raw 점수 미노출', typeof ps.message === 'string' && !/0\.\d/.test(ps.message), `"${ps.message}"`) && allPass;

  // ── [3] 성장 — C3 향상 후 직전 DIRECTOR 대비 delta
  console.log('\n[3] 성장 — C3(곱셈) 0.3→0.7, 직전 DIRECTOR 대비');
  await setMastery({ 'lab-c3': 0.7 });
  const dir2 = await generateLabReport(SID, 'DIRECTOR', period.start, period.end);
  const grown = ((dir2.summary as any).grown as Array<{ name: string; delta: number }>);
  const c3grown = grown.find((g) => g.name === '자연수의 곱셈');
  allPass = check('성장 감지: 곱셈 delta ≈ +0.4', !!c3grown && Math.abs(c3grown.delta - 0.4) < 1e-9, `grown=${JSON.stringify(grown)}`) && allPass;
  const ds2 = (dir2.summary as any).stats;
  allPass = check('성장 후 약점 2→1(곱셈 탈출)', ds2.weak === 1, `weak=${ds2.weak}`) && allPass;

  // ── [4] 영속·메타
  console.log('\n[4] 영속 — LabReport 생성, genMode=AUTO');
  const reports = await prisma.labReport.findMany({ where: { studentId: SID } });
  allPass = check('리포트 3건 생성(DIR·PARENT·DIR)', reports.length === 3, `count=${reports.length}`) && allPass;
  allPass = check('전부 genMode=AUTO', reports.every((r) => r.genMode === 'AUTO'), `modes=${[...new Set(reports.map((r) => r.genMode))].join(',')}`) && allPass;

  // ── [5] 결정성 — 같은 mastery → 같은 stats
  console.log('\n[5] 결정성 — 같은 mastery 재생성 → 같은 stats');
  const dir3 = await generateLabReport(SID, 'DIRECTOR', period.start, period.end);
  const ds3 = (dir3.summary as any).stats;
  const sameStats = ds3.conceptCount === ds2.conceptCount && ds3.mastered === ds2.mastered && ds3.inProgress === ds2.inProgress && ds3.weak === ds2.weak && Math.abs(ds3.avgScore - ds2.avgScore) < 1e-12;
  allPass = check('재생성 stats 불변(결정적)', sameStats, `mastered=${ds3.mastered} weak=${ds3.weak} avg=${ds3.avgScore.toFixed(4)}`) && allPass;

  // ── [6] 데이터 없음 — 평가 개념 0개 → '없음' 리포트('고르게 학습'과 구분)
  console.log('\n[6] 데이터 없음 — 평가 개념 0개');
  await clean();
  const empty = await generateLabReport(SID, 'PARENT', period.start, period.end);
  const es = empty.summary as any;
  allPass = check("빈 데이터 → '데이터 없음' 리포트(오해 메시지 방지)",
    es.overall === '데이터 없음' && /평가된 개념이 없습니다/.test(es.message) && es.conceptCount === 0,
    `overall=${es.overall} msg="${es.message}"`) && allPass;

  // ── [7] period 검증 — start >= end → throw
  console.log('\n[7] period 검증 — start >= end 거부');
  let threw = false;
  try {
    await generateLabReport(SID, 'DIRECTOR', new Date('2026-06-22'), new Date('2026-06-15'));
  } catch {
    threw = true;
  }
  allPass = check('잘못된 기간 거부(throw)', threw, threw ? 'throw됨' : 'throw 안 함') && allPass;

  await clean();

  line();
  console.log(allPass ? '🎉 P4 PASS — 결정적 리포트(학부모/원장) + 직전 대비 성장 추적' : '⚠️  P4 일부 단언 실패 (위 ❌ 확인)');
  line();
  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  console.error('❌ 검증 중 오류:', e);
  await prisma.$disconnect();
  process.exit(1);
});
