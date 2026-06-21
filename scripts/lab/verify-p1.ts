/**
 * 🚧 Lab P1 — autoGrader end-to-end 검증 (개발용, 읽기/쓰기)
 *   P0 검증(verify-p0.ts)이 무작위 채점(simulateManualGrading)으로 루프만 닫았다면,
 *   P1은 *알려진 답*을 제출해 autoGrader의 비교 채점이 결정적으로 정확한지 단언한다.
 *     - 짝수 index 문항 → 정답(단답은 $/공백/대문자 변형을 섞어 정규화 경로 실증)
 *     - 홀수 index 문항 → 오답
 *   → 채점 정/오가 제출답과 1:1로 일치하고, 진단(mastery)이 실제 정답률을 반영하는지 확인.
 *
 *   실행: npx tsx scripts/lab/verify-p1.ts
 *   전제: scripts/lab/seed-synthetic.ts 로 합성 데이터 시드 완료(lab-student-demo).
 *   ⚠️ lab_* 만 읽고 쓴다. 시작 시 데모 학생 트랜잭션 행을 정리해 재실행해도 결정적.
 */
import { prisma } from '@/lib/db';
import { runStudentCycle, submitAnswers, loadMasteryMap } from '@/lib/lab/service';
import { gradeObjective, normalizeChoice, normalizeShortAnswer } from '@/lib/lab/answer-compare';

const SID = 'lab-student-demo';

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

async function main() {
  let allPass = true;
  line();
  console.log('🚧 Lab P1 autoGrader 검증 — student:', SID);
  line();

  // ── 0) 순수 함수 단위 검증 (DB 불필요) — 비교/정규화/서술형 라우팅 엣지케이스
  console.log('\n[0] answer-compare 단위 검증');
  // 객관식: 정확 일치, 원형문자/문자열/번호 정규화
  allPass = check('단위: 객관식 정답', gradeObjective('MULTIPLE_CHOICE', { choice: 3 }, { choice: 3 }).correct === true, '{choice:3}=={choice:3}') && allPass;
  allPass = check('단위: 객관식 오답', gradeObjective('MULTIPLE_CHOICE', { choice: 3 }, { choice: 1 }).correct === false, '{choice:3}!={choice:1}') && allPass;
  allPass = check('단위: 보기번호 정규화(③/"3"/3 동치)', normalizeChoice('③') === 3 && normalizeChoice('3') === 3 && normalizeChoice(3) === 3, 'normalizeChoice 일치') && allPass;
  // 단답: 정규화 후 일치, 표기 변형 흡수
  allPass = check('단위: 단답 정규화 일치($/공백/대문자)', gradeObjective('SHORT_ANSWER', { value: '12' }, { value: ' $12$ ' }).correct === true, 'normalize → 일치') && allPass;
  allPass = check('단위: 단답 오답', gradeObjective('SHORT_ANSWER', { value: '12' }, { value: '13' }).correct === false, '12 != 13') && allPass;
  allPass = check('단위: 빈 정답 → 검수', gradeObjective('SHORT_ANSWER', { value: '' }, { value: 'x' }).needsReview === true, '정답 공란 → needsReview') && allPass;
  allPass = check('단위: 단답 공백문자열 정규화', normalizeShortAnswer('  \t ') === '', '공백만 → 빈문자열') && allPass;
  // 서술형: P1 범위 밖 → needsReview (진단에서 제외되어야 함)
  const desc = gradeObjective('DESCRIPTIVE', { rubric: 'x' }, { value: '아무거나' });
  allPass = check('단위: 서술형 → needsReview(P1 제외)', desc.needsReview === true && desc.confidence === 0, `needsReview=${desc.needsReview}`) && allPass;

  await clean();

  // ── 1) cold 사이클 → 워크시트 공급
  console.log('\n[1] runStudentCycle (cold) → 워크시트 공급');
  const ws1 = await runStudentCycle(SID);
  console.log('    → worksheetId:', ws1.worksheetId, '| 문항', ws1.problemIds.length);
  allPass = check('1차: 워크시트 공급', ws1.problemIds.length > 0, `문항 ${ws1.problemIds.length}개`) && allPass;

  // 워크시트 문항(정답 포함) 로드
  const wps = await prisma.labWorksheetProblem.findMany({
    where: { worksheetId: ws1.worksheetId },
    include: { problem: true },
    orderBy: { order: 'asc' },
  });

  // ── 2) 알려진 답 구성: 짝수 index → 정답, 홀수 → 오답
  const expected = new Map<string, boolean>(); // problemId → 정답이어야 하나?
  const expByConcept = new Map<string, { correct: number; total: number }>();
  const answers = wps.map((wp, i) => {
    const p = wp.problem;
    const ans = p.answer as { choice?: number; value?: string };
    const shouldBeCorrect = i % 2 === 0;
    expected.set(p.id, shouldBeCorrect);
    const agg = expByConcept.get(p.conceptId) ?? { correct: 0, total: 0 };
    agg.total += 1;
    if (shouldBeCorrect) agg.correct += 1;
    expByConcept.set(p.conceptId, agg);

    let answer: unknown;
    if (p.type === 'MULTIPLE_CHOICE') {
      const c = Number(ans?.choice);
      answer = shouldBeCorrect ? { choice: c } : { choice: (c % 5) + 1 }; // 오답 = 다른 보기번호
    } else {
      const v = String(ans?.value ?? '');
      // 정답이면 $/공백/대문자 변형을 섞어 정규화가 동작함을 실증
      answer = shouldBeCorrect ? { value: ` $${v.toUpperCase()}$ ` } : { value: `wrong-zzz-${i}` };
    }
    return { problemId: p.id, answer };
  });
  const expectedCorrectN = [...expected.values()].filter(Boolean).length;
  console.log(`    → 제출답: 정답 ${expectedCorrectN} / 오답 ${answers.length - expectedCorrectN} (단답 정답엔 정규화 변형 포함)`);

  // ── 3) 제출 (SUBMITTED, 채점 전)
  console.log('\n[2] submitAnswers → SUBMITTED (채점 전)');
  const sub = await submitAnswers(ws1.worksheetId, answers);
  const ws1subState = await prisma.labWorksheet.findUnique({ where: { id: ws1.worksheetId } });
  allPass = check('제출: 학생답 저장', sub.submittedAnswers.length === wps.length, `submitted_answers=${sub.submittedAnswers.length}`) && allPass;
  allPass = check('제출: 상태 SUBMITTED', ws1subState?.status === 'SUBMITTED', `status=${ws1subState?.status}`) && allPass;
  const preGraded = await prisma.labGradedItem.count({ where: { submissionId: sub.id } });
  allPass = check('제출: 채점 전 결과 없음', preGraded === 0, `graded_items=${preGraded}`) && allPass;

  // ── 4) 두 번째 사이클 → autoGrader 채점 → 진단
  console.log('\n[3] runStudentCycle → autoGrader 자동채점 → 진단');
  const ws2 = await runStudentCycle(SID);

  const graded = await prisma.labGradedItem.findMany({ where: { submissionId: sub.id } });
  allPass = check('채점: 결과 수 == 문항 수', graded.length === wps.length, `graded=${graded.length}`) && allPass;
  let mismatches = 0;
  for (const gi of graded) if (gi.correct !== expected.get(gi.problemId)) mismatches++;
  allPass = check('채점: 정/오가 제출답과 정확히 일치(결정적, 무작위 아님)', mismatches === 0, `불일치 ${mismatches}건`) && allPass;
  const actualCorrectN = graded.filter((g) => g.correct).length;
  allPass = check('채점: 정답 수 일치', actualCorrectN === expectedCorrectN, `auto ${actualCorrectN} == 기대 ${expectedCorrectN}`) && allPass;

  const ws1graded = await prisma.labWorksheet.findUnique({ where: { id: ws1.worksheetId } });
  const subAfter = await prisma.labSubmission.findUnique({ where: { id: sub.id } });
  allPass = check('채점: 워크시트 GRADED', ws1graded?.status === 'GRADED', `status=${ws1graded?.status}`) && allPass;
  allPass = check('채점: 제출 AUTO + gradedAt', subAfter?.genMode === 'AUTO' && !!subAfter?.gradedAt, `genMode=${subAfter?.genMode}`) && allPass;

  // 정규화 실증: 변형($/공백/대문자)을 준 단답 정답이 correct로 인식되는지
  const shortCorrectIdx = wps.findIndex((wp, i) => wp.problem.type === 'SHORT_ANSWER' && i % 2 === 0);
  if (shortCorrectIdx >= 0) {
    const pid = wps[shortCorrectIdx].problem.id;
    const gi = graded.find((g) => g.problemId === pid);
    allPass = check('정규화: 변형 단답 정답 인식($/공백/대문자)', gi?.correct === true, `단답 ${pid} correct=${gi?.correct}`) && allPass;
  } else {
    console.log('    (이 워크시트엔 짝수-index 단답이 없어 정규화 서브검증 생략)');
  }

  // ── 5) 진단 반영 — 채점 결과가 mastery로 흘러 기록됨 (진단기 무관: manual=누적정답률 / auto=BKT)
  //   ⚠️ 정확한 score 값은 진단기 구현에 의존(P2에서 BKT로 교체) → 여기선 grader 검증이 목적이므로
  //      '관측수 일치 + score가 부분정답을 반영(0<score<1)'만 단언(진단기 무관). 정확 공식 검증은 verify-p2.
  console.log('\n[4] 진단 반영 — 채점 결과가 mastery로 흐름(진단기 무관)');
  const mastery = await loadMasteryMap(SID);
  let masteryOk = Object.keys(mastery).length > 0;
  for (const [conceptId, agg] of expByConcept) {
    const m = mastery[conceptId];
    const ok = !!m && m.observationCount === agg.total && m.score > 0 && m.score < 1;
    masteryOk = masteryOk && ok;
    const cname = (await prisma.labConcept.findUnique({ where: { id: conceptId } }))?.name ?? conceptId;
    console.log(`      · ${cname}: score=${m?.score?.toFixed(3)} (정답 ${agg.correct}/${agg.total}, 관측 ${m?.observationCount})`);
  }
  allPass = check('진단: 채점→mastery 기록(관측수 일치·부분정답 반영)', masteryOk, `concepts=${Object.keys(mastery).length}`) && allPass;

  // ── 6) 루프 닫힘 — 다음 워크시트
  allPass = check('루프: 다음 워크시트 공급', ws2.problemIds.length > 0, `다음 문항 ${ws2.problemIds.length}개`) && allPass;

  line();
  console.log(allPass ? '🎉 P1 PASS — 실제 비교 채점(객관식·단답)으로 루프 닫힘' : '⚠️  P1 일부 단언 실패 (위 ❌ 확인)');
  line();
  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  console.error('❌ 검증 중 오류:', e);
  await prisma.$disconnect();
  process.exit(1);
});
