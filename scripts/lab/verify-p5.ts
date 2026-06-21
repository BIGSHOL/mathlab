/**
 * 🚧 Lab P5 — 서술형 AI 채점 end-to-end 검증 (개발용)
 *   autoGrader의 DESCRIPTIVE 분기가 AI(gradeDescriptive)로 채점하는지 검증.
 *   ⚠️ AI 비결정성 → *결정적 스텁 주입*(setDescriptiveGrader)으로 검증(실 API 비용 0).
 *      실 Gemini 경로는 별도 스모크(scripts/lab/smoke-p5-real-ai.ts, 키+플래그 필요).
 *   검증 축:
 *     [0] descriptiveVerdict 순수함수 — 부분점수→정오, 저신뢰→needsReview
 *     [1] 빈 답 폴백 — 실 채점기(reset)라도 빈 답은 AI 호출 없이 needsReview(비용 0)
 *     [2] e2e — 고신뢰 채점 → LabGradedItem(정오·부분점수·신뢰도) + 진단 DTO에 포함
 *     [3] 저신뢰 → needsReview → 진단 DTO에서 제외(사람 검수 큐)
 *
 *   실행: node --env-file=.env.local --import tsx scripts/lab/verify-p5.ts
 *   전제: seed-synthetic.ts 시드(개념 lab-c1·데모학생). 시작/끝 정리(결정적).
 */
import { prisma } from '@/lib/db';
import { autoGrader } from '@/lib/lab/pipeline/auto-grader';
import { runStudentCycle, loadMasteryMap } from '@/lib/lab/service';
import {
  descriptiveVerdict,
  gradeDescriptive,
  setDescriptiveGrader,
  resetDescriptiveGrader,
} from '@/lib/lab/pipeline/descriptive-grader';

const SID = 'lab-student-demo';
const PID = 'lab-p5-desc-test';
const RUBRIC = { rubric: '모범답안: 자연수의 덧셈은 두 수를 합쳐 더 큰 수를 만드는 연산이며, 수직선 위에서 오른쪽으로 이동하는 것으로 설명할 수 있다.' };

function line() { console.log('─'.repeat(60)); }
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? '✅' : '❌'} ${label} — ${detail}`);
  return ok;
}

async function cleanTx() {
  await prisma.labGradedItem.deleteMany({ where: { submission: { studentId: SID } } });
  await prisma.labSubmissionItem.deleteMany({ where: { submission: { studentId: SID } } });
  await prisma.labSubmission.deleteMany({ where: { studentId: SID } });
  await prisma.labWorksheetProblem.deleteMany({ where: { worksheet: { studentId: SID } } });
  await prisma.labWorksheet.deleteMany({ where: { studentId: SID } });
}
async function cleanAll() {
  await cleanTx();
  await prisma.labProblem.deleteMany({ where: { id: PID } });
  resetDescriptiveGrader();
}

/** 서술형 문제(루브릭) + 워크시트 + 제출(학생 서술답) 생성 → worksheetId. */
async function makeDescriptiveWorksheet(answerText: string): Promise<string> {
  await prisma.labProblem.upsert({
    where: { id: PID },
    create: { id: PID, conceptId: 'lab-c1', type: 'DESCRIPTIVE', difficulty: 3, source: 'p5-test', bodyRef: 'p5://desc', answer: RUBRIC },
    update: { type: 'DESCRIPTIVE', answer: RUBRIC },
  });
  const ws = await prisma.labWorksheet.create({
    data: { studentId: SID, status: 'SUBMITTED', genMode: 'AUTO', problems: { create: [{ problemId: PID, order: 0 }] } },
  });
  await prisma.labSubmission.create({
    data: {
      worksheetId: ws.id,
      studentId: SID,
      genMode: 'AUTO',
      submittedAnswers: { create: [{ problemId: PID, order: 0, answer: { value: answerText } }] },
    },
  });
  return ws.id;
}

async function main() {
  let allPass = true;
  line();
  console.log('🚧 Lab P5 서술형 AI 채점 검증 — student:', SID);
  line();
  await cleanAll();

  // ── [0] descriptiveVerdict 순수함수
  console.log('\n[0] descriptiveVerdict 순수함수');
  const vGood = descriptiveVerdict(0.9, 0.95, 'NONE');
  allPass = check('고점수·고신뢰 → 정답·검수불요', vGood.correct === true && vGood.needsReview === false && vGood.partialScore === 0.9, JSON.stringify(vGood)) && allPass;
  const vWrong = descriptiveVerdict(0.2, 0.9, 'CONCEPT');
  allPass = check('저점수(<0.5) → 오답·errorType 보존', vWrong.correct === false && vWrong.errorType === 'CONCEPT', JSON.stringify(vWrong)) && allPass;
  const vLowConf = descriptiveVerdict(0.85, 0.3, 'NONE');
  allPass = check('저신뢰(<0.6) → needsReview(정오와 무관)', vLowConf.correct === true && vLowConf.needsReview === true, JSON.stringify(vLowConf)) && allPass;

  // ── [1] 빈 답 폴백 (실 채점기여도 AI 호출 없이 needsReview)
  console.log('\n[1] 빈 답 폴백 — AI 호출 없이 needsReview(비용 0)');
  resetDescriptiveGrader();
  const vEmpty = await gradeDescriptive({ rubric: RUBRIC, studentAnswer: { value: '' } });
  allPass = check('빈 답 → needsReview·confidence 0(AI 미호출)', vEmpty.needsReview === true && vEmpty.confidence === 0, JSON.stringify(vEmpty)) && allPass;

  // ── [2] e2e 고신뢰 채점 → 진단 DTO 포함
  console.log('\n[2] e2e — 고신뢰 서술형 채점(스텁) → LabGradedItem + 진단 DTO');
  setDescriptiveGrader(async () => descriptiveVerdict(0.9, 0.95, 'NONE'));
  const ws1 = await makeDescriptiveWorksheet('자연수의 덧셈은 두 수를 합쳐 더 큰 수를 만드는 연산입니다. 수직선에서 오른쪽으로 이동합니다.');
  const res1 = await autoGrader.run({ worksheetId: ws1, answerRef: '' });
  const gi1 = await prisma.labGradedItem.findFirst({ where: { problemId: PID } });
  allPass = check('채점 결과 영속(정답·부분점수·신뢰도)', gi1?.correct === true && gi1?.partialScore === 0.9 && gi1?.confidence === 0.95 && gi1?.needsReview === false, `correct=${gi1?.correct} ps=${gi1?.partialScore} conf=${gi1?.confidence}`) && allPass;
  allPass = check('고신뢰 → 진단 DTO에 포함', res1.items.length === 1 && res1.items[0].correct === true, `items=${res1.items.length}`) && allPass;

  await cleanTx();

  // ── [3] 저신뢰 → needsReview → 진단 DTO 제외
  console.log('\n[3] 저신뢰 서술형 → needsReview → 진단 DTO 제외');
  setDescriptiveGrader(async () => descriptiveVerdict(0.8, 0.3, 'NONE'));
  const ws2 = await makeDescriptiveWorksheet('음... 더하기? 잘 모르겠어요');
  const res2 = await autoGrader.run({ worksheetId: ws2, answerRef: '' });
  const gi2 = await prisma.labGradedItem.findFirst({ where: { problemId: PID } });
  allPass = check('저신뢰 채점 영속 + needsReview=true', gi2?.needsReview === true && gi2?.confidence === 0.3, `needsReview=${gi2?.needsReview} conf=${gi2?.confidence}`) && allPass;
  allPass = check('저신뢰 → 진단 DTO에서 제외', res2.items.length === 0, `items=${res2.items.length}(0이어야)`) && allPass;

  // ── [4] 서술형 → 진단 → mastery 갱신 (스택리뷰 #1 해소 실증: 고신뢰 서술형이 즉시 진단됨)
  console.log('\n[4] 서술형 고신뢰 → runStudentCycle → mastery 갱신');
  await cleanTx();
  await prisma.labMasteryRecord.deleteMany({ where: { studentId: SID } });
  await prisma.labPrescriptionItem.deleteMany({ where: { prescription: { studentId: SID } } });
  await prisma.labPrescription.deleteMany({ where: { studentId: SID } });
  setDescriptiveGrader(async () => descriptiveVerdict(0.9, 0.95, 'NONE'));
  await makeDescriptiveWorksheet('자연수의 덧셈은 두 수를 합쳐 더 큰 수를 만드는 연산이며 수직선에서 오른쪽으로 이동합니다.');
  await runStudentCycle(SID); // 채점(서술형 AI 스텁) → 진단(BKT)
  const mastery = await loadMasteryMap(SID);
  const mC1 = mastery['lab-c1'];
  allPass = check('서술형 채점이 mastery로 흐름(cold 아님)', !!mC1 && mC1.observationCount >= 1 && mC1.score > 0.25,
    `lab-c1 score=${mC1?.score?.toFixed(3)} obs=${mC1?.observationCount}`) && allPass;
  // 정리: 위 사이클이 만든 후속 워크시트/처방까지
  await cleanTx();
  await prisma.labMasteryRecord.deleteMany({ where: { studentId: SID } });
  await prisma.labPrescriptionItem.deleteMany({ where: { prescription: { studentId: SID } } });
  await prisma.labPrescription.deleteMany({ where: { studentId: SID } });

  await cleanAll();

  line();
  console.log(allPass ? '🎉 P5 PASS — 서술형 AI 채점(주입형) + needsReview 라우팅' : '⚠️  P5 일부 단언 실패 (위 ❌ 확인)');
  line();
  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  console.error('❌ 검증 중 오류:', e);
  await prisma.$disconnect();
  process.exit(1);
});
