/**
 * 🚧 Lab P3 — smartPrescriber end-to-end 검증 (개발용)
 *   처방을 dumb(진도표만) → smart(BKT 약점·선수개념 적응)로 교체.
 *   검증 축:
 *     [0] 정책 순수함수 — 난이도/문항수 적응, cold 기본값
 *     [1] 적응 처방 — 약한 현위치=쉽게·적게 / 강한 현위치=어렵게·많게
 *     [2] 선수개념 소프트 게이팅 — 미흡 선수개념을 *앞 순서로 함께* 처방(강한 선수는 제외)
 *     [3] 약점 복습 오버레이 — 과거 약점(관측 있는) top K 주입
 *     [4] 해자 대비 — 같은 위치, 강 vs 약 학생에게 *다른* 처방(dumb은 동일)
 *     [5] cold 무회귀 — 증거 없으면 dumb 베이스라인(난이도2·5문항)
 *     [6] 파이프라인 통합 — runStudentCycle(smartPrescriber 활성)로 워크시트 공급
 *
 *   실행: node --env-file=.env.local --import tsx scripts/lab/verify-p3.ts
 *   전제: seed-synthetic.ts 시드(개념 5·선수그래프 5·데모학생). [1]~[5]는 synthetic masteryMap을
 *         직접 넣어 smartPrescriber.run을 호출 → DB 무변경(시드 읽기만). [6]만 데모학생 행 정리.
 */
import { prisma } from '@/lib/db';
import { runStudentCycle } from '@/lib/lab/service';
import { smartPrescriber } from '@/lib/lab/pipeline/smart-prescriber';
import { adaptiveDifficulty, adaptiveCount, prescribeParams, COLD_DIFFICULTY, COLD_COUNT } from '@/lib/lab/prescribe-policy';
import type { MasteryMap, MasteryEntry, PrescriptionItemDTO } from '@/lib/lab/stages';

const SID = 'lab-student-demo';

function line() { console.log('─'.repeat(60)); }
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? '✅' : '❌'} ${label} — ${detail}`);
  return ok;
}
function mm(entries: Array<[string, number, number]>): MasteryMap {
  const map: MasteryMap = {};
  for (const [conceptId, score, observationCount] of entries) map[conceptId] = { conceptId, score, observationCount };
  return map;
}
function byConcept(items: PrescriptionItemDTO[]) {
  const m = new Map<string, PrescriptionItemDTO>();
  for (const it of items) m.set(it.conceptId, it);
  return m;
}

async function cleanDemo() {
  await prisma.labGradedItem.deleteMany({ where: { submission: { studentId: SID } } });
  await prisma.labSubmissionItem.deleteMany({ where: { submission: { studentId: SID } } });
  await prisma.labSubmission.deleteMany({ where: { studentId: SID } });
  await prisma.labWorksheetProblem.deleteMany({ where: { worksheet: { studentId: SID } } });
  await prisma.labWorksheet.deleteMany({ where: { studentId: SID } });
  await prisma.labMasteryRecord.deleteMany({ where: { studentId: SID } });
  await prisma.labPrescriptionItem.deleteMany({ where: { prescription: { studentId: SID } } });
  await prisma.labPrescription.deleteMany({ where: { studentId: SID } });
}

async function main() {
  let allPass = true;
  line();
  console.log('🚧 Lab P3 smartPrescriber 검증 — student:', SID);
  line();

  // ── [0] 정책 순수함수
  console.log('\n[0] 처방 정책 순수함수');
  allPass = check('난이도 적응(NORMAL): 0.3→1, 0.5→2, 0.75→3, 0.92→4, 0.97→5',
    adaptiveDifficulty(0.3) === 1 && adaptiveDifficulty(0.5) === 2 && adaptiveDifficulty(0.75) === 3 && adaptiveDifficulty(0.92) === 4 && adaptiveDifficulty(0.97) === 5,
    `${[0.3, 0.5, 0.75, 0.92, 0.97].map((p) => adaptiveDifficulty(p)).join(',')}`) && allPass;
  allPass = check('난이도 교정(remedial) 상한 3: 0.92→3', adaptiveDifficulty(0.92, true) === 3, `remedial(0.92)=${adaptiveDifficulty(0.92, true)}`) && allPass;
  allPass = check('문항수 적응: 0.3→3, 0.5→5, 0.75→6, 0.9→7',
    adaptiveCount(0.3) === 3 && adaptiveCount(0.5) === 5 && adaptiveCount(0.75) === 6 && adaptiveCount(0.9) === 7,
    `${[0.3, 0.5, 0.75, 0.9].map((p) => adaptiveCount(p)).join(',')}`) && allPass;
  allPass = check('cold(증거없음) → dumb 베이스라인', (() => { const r = prescribeParams(undefined); return r.difficulty === COLD_DIFFICULTY && r.count === COLD_COUNT; })(), `{${COLD_DIFFICULTY},${COLD_COUNT}}`) && allPass;

  // ── [1] 적응 처방 (현위치 강 vs 약) — month1 session1 → C1
  console.log('\n[1] 적응 처방 — 현위치 개념');
  const strong = await smartPrescriber.run({ studentId: SID, mastery: mm([['lab-c1', 0.9, 5]]), track: 'CURRENT', monthIdx: 1, sessionIdx: 1 });
  const sC1 = byConcept(strong.items).get('lab-c1');
  allPass = check('강한 현위치(0.9) → 난이도↑·문항↑', sC1?.difficulty === 4 && sC1?.count === 7, `C1 diff=${sC1?.difficulty} cnt=${sC1?.count}`) && allPass;
  const weakCur = await smartPrescriber.run({ studentId: SID, mastery: mm([['lab-c1', 0.3, 5]]), track: 'CURRENT', monthIdx: 1, sessionIdx: 1 });
  const wC1 = byConcept(weakCur.items).get('lab-c1');
  allPass = check('약한 현위치(0.3) → 난이도↓·문항↓(교정)', wC1?.difficulty === 1 && wC1?.count === 3, `C1 diff=${wC1?.difficulty} cnt=${wC1?.count}`) && allPass;

  // ── [2] 선수개념 소프트 게이팅 — month3 session1 → C5(분수), 선수 C2·C4
  console.log('\n[2] 선수개념 소프트 게이팅 — C5(분수) 약, 선수 C2 약 / C4 강');
  const gate = await smartPrescriber.run({
    studentId: SID,
    mastery: mm([['lab-c5', 0.3, 5], ['lab-c2', 0.4, 5], ['lab-c4', 0.85, 5]]),
    track: 'CURRENT', monthIdx: 3, sessionIdx: 1,
  });
  const gMap = byConcept(gate.items);
  const c2 = gMap.get('lab-c2'), c5 = gMap.get('lab-c5'), c4 = gMap.get('lab-c4');
  allPass = check('미흡 선수 C2(0.4) 주입', !!c2 && /PREREQ_GAP/.test(c2.reason ?? ''), `C2=${c2?.reason ?? '없음'}`) && allPass;
  allPass = check('강한 선수 C4(0.85) 제외', !c4, `C4 ${c4 ? '처방됨(❌)' : '제외'}`) && allPass;
  allPass = check('선수 C2가 현위치 C5보다 앞 순서', !!c2 && !!c5 && c2.order < c5.order, `C2.order=${c2?.order} < C5.order=${c5?.order}`) && allPass;
  allPass = check('현위치 C5 교정 난이도', c5?.difficulty === 1 && /CURRENT_POSITION/.test(c5?.reason ?? ''), `C5 diff=${c5?.difficulty}`) && allPass;

  // ── [2b] cold 선수개념 주입 — 약한 현위치의 *미시도* 선수도 토대 보강(기본값)
  const gateCold = await smartPrescriber.run({
    studentId: SID,
    mastery: mm([['lab-c5', 0.3, 5], ['lab-c4', 0.85, 5]]), // C5 약 / C2 mastery 없음(cold) / C4 강
    track: 'CURRENT', monthIdx: 3, sessionIdx: 1,
  });
  const gc2 = byConcept(gateCold.items).get('lab-c2');
  allPass = check('cold 선수 C2(미시도) 주입(PREREQ_GAP cold)', /PREREQ_GAP/.test(gc2?.reason ?? '') && /cold/.test(gc2?.reason ?? ''), `C2=${gc2?.reason ?? '없음'}`) && allPass;
  allPass = check('cold 선수 처방=기본값(난이도2·5문항)', gc2?.difficulty === 2 && gc2?.count === 5, `C2 diff=${gc2?.difficulty} cnt=${gc2?.count}`) && allPass;

  // ── [3] 약점 복습 오버레이 — 현위치 외 과거 약점 top K
  console.log('\n[3] 약점 복습 오버레이 — 현위치 외 약점 주입');
  const overlay = await smartPrescriber.run({
    studentId: SID,
    mastery: mm([['lab-c1', 0.9, 5], ['lab-c2', 0.3, 5], ['lab-c3', 0.5, 5]]), // 현위치 C1 강, C2·C3 과거 약점
    track: 'CURRENT', monthIdx: 1, sessionIdx: 1,
  });
  const oMap = byConcept(overlay.items);
  allPass = check('과거 약점 C2·C3 복습 주입(WEAKNESS_REVIEW)',
    /WEAKNESS_REVIEW/.test(oMap.get('lab-c2')?.reason ?? '') && /WEAKNESS_REVIEW/.test(oMap.get('lab-c3')?.reason ?? ''),
    `C2=${oMap.get('lab-c2')?.reason ?? '없음'} / C3=${oMap.get('lab-c3')?.reason ?? '없음'}`) && allPass;
  allPass = check('가장 약한 것 우선(C2 0.3가 C3 0.5보다 앞)', (oMap.get('lab-c2')?.order ?? 9) < (oMap.get('lab-c3')?.order ?? -1), `C2.order=${oMap.get('lab-c2')?.order} < C3.order=${oMap.get('lab-c3')?.order}`) && allPass;

  // ── [4] 해자: 같은 위치, 강 vs 약 → 다른 처방
  console.log('\n[4] 해자 — 같은 위치, 강 vs 약 학생');
  const diff = sC1?.difficulty !== wC1?.difficulty || sC1?.count !== wC1?.count;
  allPass = check('강 학생 ≠ 약 학생 처방(dumb은 동일했음)', diff, `강 {${sC1?.difficulty},${sC1?.count}} vs 약 {${wC1?.difficulty},${wC1?.count}}`) && allPass;

  // ── [5] cold 무회귀
  console.log('\n[5] cold 무회귀 — 증거 없으면 dumb 베이스라인');
  const cold = await smartPrescriber.run({ studentId: SID, mastery: {}, track: 'CURRENT', monthIdx: 1, sessionIdx: 1 });
  const coldC1 = byConcept(cold.items).get('lab-c1');
  allPass = check('cold 현위치 → 난이도2·5문항(=dumb)', coldC1?.difficulty === COLD_DIFFICULTY && coldC1?.count === COLD_COUNT, `C1 diff=${coldC1?.difficulty} cnt=${coldC1?.count}`) && allPass;

  // ── [6] 파이프라인 통합 — runStudentCycle(smartPrescriber 활성)
  //   ⚠️ 처방(PrescriptionDTO)은 현재 ephemeral(공급으로만 흐르고 LabPrescription 미영속, P0 설계 — worksheet.prescriptionId=null).
  //      → 여기선 smartPrescriber가 사이클에서 호출돼 워크시트가 공급되는지(통합)만 확인. 알고리즘 자체는 [1]~[5]에서 직접 검증.
  console.log('\n[6] 파이프라인 통합 — runStudentCycle(cold)');
  await cleanDemo();
  const ws = await runStudentCycle(SID);
  const wps = await prisma.labWorksheetProblem.count({ where: { worksheet: { studentId: SID } } });
  allPass = check('smartPrescriber로 워크시트 공급(통합)', ws.problemIds.length > 0 && wps === ws.problemIds.length, `문항 ${ws.problemIds.length}개 (DB ${wps})`) && allPass;
  await cleanDemo();

  line();
  console.log(allPass ? '🎉 P3 PASS — 약점·선수개념 적응 처방으로 dumb 대비 개인화 달성' : '⚠️  P3 일부 단언 실패 (위 ❌ 확인)');
  line();
  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  console.error('❌ 검증 중 오류:', e);
  await prisma.$disconnect();
  process.exit(1);
});
