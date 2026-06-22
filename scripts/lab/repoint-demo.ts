/**
 * 🚧 Lab — 데모 학생 실 데이터 repoint (개발용)
 *   합성 개념(lab-c*) → 중1-1 실 개념(lab-cur-mid-13-*)으로 데모 학생을 옮긴다.
 *   토대3 "실 데이터 루프": 인제스트한 실문제로 진단→처방→공급→채점→보고가 돌게 한다.
 *
 *     1) 데모 학생의 트랜잭션 행(워크시트/제출/채점/숙련도/처방/리포트) 정리 — 합성 잔여 제거
 *        (시드: 개념·문항·진도 그래프는 건드리지 않음)
 *     2) pacing을 (CURRENT, 13, 1) = 소인수분해로 이동 + grade 중1
 *     3) cold 사이클 1회 → 첫 실 워크시트(PRESCRIBED) 생성 → 바로 풀 수 있는 상태
 *
 *   재실행 안전(idempotent): clean 후 재구성.
 *   실행: node --env-file=.env --import tsx scripts/lab/repoint-demo.ts
 *
 *   ⚠️ lab_* 만 읽고 쓴다(데모 학생 1명 범위). 기출분석/공유 테이블 무관.
 */
import { prisma } from '@/lib/db';
import { runStudentCycle } from '@/lib/lab/service';

const SID = 'lab-student-demo';
// 중1-1 첫 개념(소인수분해). 처방은 (track, monthIdx, sessionIdx) 정확 매칭으로 현위치 개념을 잡는다.
const TARGET = { track: 'CURRENT' as const, monthIdx: 13, sessionIdx: 1 };

async function clean() {
  // children → parents 순서로 데모 학생의 트랜잭션 행만 제거(FK 안전, verify-p0 clean과 동일 순서)
  await prisma.labGradedItem.deleteMany({ where: { submission: { studentId: SID } } });
  await prisma.labSubmissionItem.deleteMany({ where: { submission: { studentId: SID } } });
  await prisma.labSubmission.deleteMany({ where: { studentId: SID } });
  await prisma.labWorksheetProblem.deleteMany({ where: { worksheet: { studentId: SID } } });
  await prisma.labWorksheet.deleteMany({ where: { studentId: SID } });
  await prisma.labMasteryRecord.deleteMany({ where: { studentId: SID } });
  await prisma.labPrescriptionItem.deleteMany({ where: { prescription: { studentId: SID } } });
  await prisma.labPrescription.deleteMany({ where: { studentId: SID } });
  await prisma.labReport.deleteMany({ where: { studentId: SID } });
}

async function main() {
  // 0) 대상 개념 + 문제 존재 확인 (가드: 인제스트 안 됐으면 즉시 중단)
  const target = await prisma.labConcept.findFirst({ where: TARGET });
  if (!target) throw new Error(`대상 개념 없음: ${JSON.stringify(TARGET)} — seed-curriculum 필요`);
  const probCount = await prisma.labProblem.count({ where: { conceptId: target.id } });
  if (probCount === 0) throw new Error(`대상 개념 ${target.id}(${target.name})에 문제 0개 — 인제스트 필요`);
  console.log(`대상 개념: ${target.id} · ${target.name} (${probCount}문항)`);

  // 1) 합성 잔여 정리
  await clean();
  console.log('✓ 데모 학생 트랜잭션 행 정리 완료');

  // 2) 학생/진도 repoint
  await prisma.labStudent.upsert({
    where: { id: SID },
    create: { id: SID, name: '데모 학생', grade: '중1' },
    update: { grade: '중1' },
  });
  await prisma.labPacingPosition.upsert({
    where: { studentId: SID },
    create: { studentId: SID, ...TARGET },
    update: { ...TARGET },
  });
  console.log('✓ pacing → (CURRENT, 13, 1) · grade 중1');

  // 3) cold 사이클 1회 → 첫 실 워크시트(PRESCRIBED)
  const ws = await runStudentCycle(SID);
  const wsRow = await prisma.labWorksheet.findUnique({
    where: { id: ws.worksheetId },
    include: { problems: { orderBy: { order: 'asc' }, include: { problem: { include: { concept: true } } } } },
  });
  console.log(`\n✅ repoint 완료 — 첫 워크시트 ${ws.worksheetId} [${wsRow?.status}] ${ws.problemIds.length}문항`);
  for (const wp of wsRow?.problems ?? []) {
    const body = (wp.problem.body ?? '(본문 없음)').replace(/\s+/g, ' ').slice(0, 48);
    console.log(`   #${wp.order + 1} ${wp.problem.concept.name} Lv${wp.problem.difficulty} ${wp.problem.type} — ${body}…`);
  }
  console.log('\n   → /lab 코크핏에서 "풀기"로 실 본문을 보고, 제출 후 "데모 사이클"로 채점→진단을 돌리세요.');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ repoint 실패:', e);
  await prisma.$disconnect();
  process.exit(1);
});
