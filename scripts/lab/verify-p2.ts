/**
 * 🚧 Lab P2 — autoDiagnoser(BKT) end-to-end 검증 (개발용, 읽기/쓰기)
 *   P1이 채점을 실제 비교로 만들었다면, P2는 진단을 누적정답률 → BKT(p(mastered))로 교체.
 *   검증 3축:
 *     [0] BKT 순수 함수 — 정답→상승 / 오답→하강 / 연속정답→수렴(증분 감소) / slip 강건성
 *     [1] e2e 결정적 — cold→전정답 제출→사이클 후 DB score == bktFold(pure) 정확 일치
 *     [2] 수렴 — 다음 사이클 전정답 → score 추가 상승, 증분은 이전보다 작음
 *     [3] 멱등성 — 새 제출 없이 사이클 재실행 → mastery 불변(diagnosedAt 게이트, 이중관측 방지)
 *
 *   실행: node --env-file=.env.local --import tsx scripts/lab/verify-p2.ts
 *   전제: seed-synthetic.ts 시드 완료(lab-student-demo). ⚠️ lab_* 만 읽고 쓴다(재실행 결정적).
 */
import { prisma } from '@/lib/db';
import { runStudentCycle, submitAnswers, loadMasteryMap } from '@/lib/lab/service';
import { BKT_PARAMS, bktPosterior, bktFold } from '@/lib/lab/bkt';

const SID = 'lab-student-demo';
const EPS = 1e-9;

function line() { console.log('─'.repeat(60)); }
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? '✅' : '❌'} ${label} — ${detail}`);
  return ok;
}

async function clean() {
  await prisma.labGradedItem.deleteMany({ where: { submission: { studentId: SID } } });
  await prisma.labSubmissionItem.deleteMany({ where: { submission: { studentId: SID } } });
  await prisma.labSubmission.deleteMany({ where: { studentId: SID } });
  await prisma.labWorksheetProblem.deleteMany({ where: { worksheet: { studentId: SID } } });
  await prisma.labWorksheet.deleteMany({ where: { studentId: SID } });
  await prisma.labMasteryRecord.deleteMany({ where: { studentId: SID } });
  await prisma.labPrescriptionItem.deleteMany({ where: { prescription: { studentId: SID } } });
  await prisma.labPrescription.deleteMany({ where: { studentId: SID } });
}

/** 워크시트의 모든 문항에 '정답'(problem.answer 그대로)을 제출 → 전정답. 단일 개념 가정 검증 포함. */
async function submitAllCorrect(worksheetId: string) {
  const wps = await prisma.labWorksheetProblem.findMany({
    where: { worksheetId },
    include: { problem: true },
    orderBy: { order: 'asc' },
  });
  const concepts = new Set(wps.map((w) => w.problem.conceptId));
  const answers = wps.map((wp) => ({ problemId: wp.problemId, answer: wp.problem.answer as unknown }));
  await submitAnswers(worksheetId, answers);
  return { n: wps.length, singleConcept: concepts.size === 1, conceptId: wps[0]?.problem.conceptId };
}

async function main() {
  let allPass = true;
  line();
  console.log('🚧 Lab P2 autoDiagnoser(BKT) 검증 — student:', SID);
  console.log(`   BKT_PARAMS: pL0=${BKT_PARAMS.pL0} pT=${BKT_PARAMS.pT} pS=${BKT_PARAMS.pS} pG=${BKT_PARAMS.pG}`);
  line();

  // ── [0] BKT 순수 함수 단위 검증 (DB 불필요)
  console.log('\n[0] BKT 순수 함수');
  const L0 = BKT_PARAMS.pL0;
  const c1 = bktPosterior(L0, true);
  const w1 = bktPosterior(L0, false);
  allPass = check('정답 → p(mastered) 상승', c1 > L0, `${L0.toFixed(3)} → ${c1.toFixed(3)}`) && allPass;
  allPass = check('오답 → p(mastered) 하강', w1 < L0, `${L0.toFixed(3)} → ${w1.toFixed(3)}`) && allPass;

  // 연속 정답 → 단조증가 + 증분 감소(수렴)
  const seq = [L0];
  for (let i = 0; i < 4; i++) seq.push(bktPosterior(seq[seq.length - 1], true));
  let mono = true, converging = true;
  for (let i = 1; i < seq.length; i++) {
    if (!(seq[i] > seq[i - 1])) mono = false;
    if (i >= 2 && !(seq[i] - seq[i - 1] < seq[i - 1] - seq[i - 2] + EPS)) converging = false;
  }
  allPass = check('연속 정답 → 단조증가', mono, seq.map((s) => s.toFixed(3)).join(' → ')) && allPass;
  allPass = check('연속 정답 → 증분 감소(수렴)', converging, '상승폭 점감') && allPass;

  // 연속 오답 → 단조감소
  let lf = L0, monoDown = true;
  for (let i = 0; i < 4; i++) { const nx = bktPosterior(lf, false); if (!(nx < lf)) monoDown = false; lf = nx; }
  allPass = check('연속 오답 → 단조감소', monoDown, `최종 ${lf.toFixed(3)}`) && allPass;

  // slip 강건성: [정답5, 오답1]은 [오답1]보다 훨씬 높음(이력 반영) + 0.5 이상 유지
  const robust = bktFold(L0, [true, true, true, true, true, false]);
  const justWrong = bktFold(L0, [false]);
  allPass = check('slip 강건성: [정답5,오답1] ≫ [오답1] & ≥0.5', robust > justWrong && robust >= 0.5,
    `robust=${robust.toFixed(3)} vs justWrong=${justWrong.toFixed(3)}`) && allPass;

  // [0]은 순수함수(DB 무관) → 여기서 데모 학생 lab_* 정리: [1]~[3] e2e를 결정적 상태에서 시작.
  await clean();

  // ── [1] e2e 결정적: cold → 전정답 제출 → 사이클 → DB score == bktFold(pure)
  console.log('\n[1] e2e — cold→전정답→사이클: DB == BKT 순수계산');
  const ws1 = await runStudentCycle(SID); // cold → 워크시트
  const a1 = await submitAllCorrect(ws1.worksheetId);
  allPass = check('워크시트 단일 개념(검증 단순화 전제)', a1.singleConcept, `concepts=1? n=${a1.n}, concept=${a1.conceptId}`) && allPass;
  await runStudentCycle(SID); // 채점(autoGrader) → 진단(BKT)

  const m1 = await loadMasteryMap(SID);
  const rec1 = a1.conceptId ? m1[a1.conceptId] : undefined;
  const expected1 = bktFold(BKT_PARAMS.pL0, Array(a1.n).fill(true));
  allPass = check('진단: 관측수 == 문항수', rec1?.observationCount === a1.n, `obs=${rec1?.observationCount}, n=${a1.n}`) && allPass;
  allPass = check('진단: DB score == bktFold(pL0, [정답×n]) 정확 일치', !!rec1 && Math.abs(rec1.score - expected1) < EPS,
    `DB=${rec1?.score?.toFixed(6)} vs pure=${expected1.toFixed(6)}`) && allPass;
  allPass = check('진단: 전정답이라 score > pL0', !!rec1 && rec1.score > BKT_PARAMS.pL0, `score=${rec1?.score?.toFixed(3)}`) && allPass;

  // ── [2] 수렴: 다음 사이클 전정답 → score 추가 상승, 증분 < 첫 증분
  console.log('\n[2] 수렴 — 두 번째 전정답 사이클');
  const score1 = rec1!.score;
  // 첫 사이클이 만든 다음 워크시트(ws2)에 전정답 제출
  const ws2 = await prisma.labWorksheet.findFirst({
    where: { studentId: SID, status: 'PRESCRIBED' },
    orderBy: { createdAt: 'desc' },
  });
  allPass = check('다음 워크시트 존재(루프 지속)', !!ws2, `ws2=${ws2?.id ?? 'none'}`) && allPass;
  const a2 = await submitAllCorrect(ws2!.id);
  await runStudentCycle(SID); // ws2 제출 채점 → BKT 진단(prior=score1)

  const m2 = await loadMasteryMap(SID);
  const score2 = a2.conceptId ? m2[a2.conceptId]!.score : 0;
  const expected2 = bktFold(score1, Array(a2.n).fill(true));
  allPass = check('수렴: score 추가 상승', score2 > score1, `${score1.toFixed(4)} → ${score2.toFixed(4)}`) && allPass;
  allPass = check('수렴: DB score == bktFold(prior=score1, [정답×n])', Math.abs(score2 - expected2) < EPS,
    `DB=${score2.toFixed(6)} vs pure=${expected2.toFixed(6)}`) && allPass;
  allPass = check('수렴: 증분 감소(2차 < 1차)', (score2 - score1) < (score1 - BKT_PARAMS.pL0),
    `Δ2=${(score2 - score1).toFixed(4)} < Δ1=${(score1 - BKT_PARAMS.pL0).toFixed(4)}`) && allPass;

  // ── [3] 멱등성: 새 제출 없이 사이클 재실행 → mastery 불변
  console.log('\n[3] 멱등성 — 새 제출 없이 재실행');
  await runStudentCycle(SID); // 최신 제출(ws2)은 이미 진단됨 → graded=[] → 진단 no-op
  const m3 = await loadMasteryMap(SID);
  const score3 = a2.conceptId ? m3[a2.conceptId]!.score : -1;
  allPass = check('멱등: 재실행해도 score 불변(이중관측 방지)', Math.abs(score3 - score2) < EPS,
    `${score2.toFixed(6)} == ${score3.toFixed(6)}`) && allPass;
  // 제출이 diagnosedAt으로 마킹됐는지
  const diagnosed = await prisma.labSubmission.count({ where: { studentId: SID, diagnosedAt: { not: null } } });
  const subTotal = await prisma.labSubmission.count({ where: { studentId: SID } });
  allPass = check('멱등: 모든 제출 diagnosedAt 마킹', diagnosed === subTotal && subTotal > 0, `${diagnosed}/${subTotal}`) && allPass;

  line();
  console.log(allPass ? '🎉 P2 PASS — BKT 진단이 결정적으로 수렴하고 멱등하다' : '⚠️  P2 일부 단언 실패 (위 ❌ 확인)');
  line();
  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  console.error('❌ 검증 중 오류:', e);
  await prisma.$disconnect();
  process.exit(1);
});
