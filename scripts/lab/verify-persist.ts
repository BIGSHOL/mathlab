// 🚧 Lab 토대3 검증 — 생성→영속 글루 (DI 스텁, 실 API $0). DB에 테스트행 생성 후 정리.
//   run: node --env-file=.env --import tsx scripts/lab/verify-persist.ts
import { prisma } from '@/lib/db';
import {
  generateProblemsForConcept,
  setProblemGenerator,
  resetProblemGenerator,
} from '@/lib/lab/problem-gen';
import { persistGeneratedProblems } from '@/lib/lab/persist';

function check(ok: boolean, label: string, detail: string): boolean {
  console.log(`${ok ? '✅' : '❌'} ${label} — ${detail}`);
  return ok;
}
function line() {
  console.log('─'.repeat(60));
}

async function main() {
  let allPass = true;
  line();
  console.log('🚧 Lab 토대3 — 생성→영속 글루 검증 (스텁 $0)');
  line();

  // 결정적 스텁(실 Gemini 미호출 → 비용 0): type별 유효 raw 반환
  setProblemGenerator(async (input) => {
    if (input.type === 'MULTIPLE_CHOICE')
      return {
        body: `[검증] ${input.conceptName} 객관식 $1+1$`,
        choices: ['$1$', '$2$', '$3$', '$4$', '$5$'],
        answerIndex: 2,
        explanation: '풀이',
      };
    if (input.type === 'SHORT_ANSWER')
      return { body: `[검증] ${input.conceptName} 단답 $2 \\times 3$`, answer: '$6$', explanation: '풀이' };
    return { body: `[검증] ${input.conceptName} 서술형`, rubric: '모범답안 + 채점기준', explanation: '풀이' };
  });

  // 실제 개념 1개에 귀속(FK) — 합성/실 무관, 첫 개념
  const concept = await prisma.labConcept.findFirst({ orderBy: { id: 'asc' } });
  if (!concept) throw new Error('LabConcept 없음 — seed 필요');
  console.log(`대상 개념: ${concept.id} (${concept.name})\n`);

  const gen = await generateProblemsForConcept({
    conceptName: concept.name,
    domain: concept.domain ?? undefined,
    plan: [
      { type: 'MULTIPLE_CHOICE', difficulty: 2 },
      { type: 'SHORT_ANSWER', difficulty: 3 },
      { type: 'DESCRIPTIVE', difficulty: 4 },
    ],
  });
  resetProblemGenerator();
  allPass = check(gen.ok.length === 3 && gen.failed.length === 0, '생성(스텁)', `ok=${gen.ok.length} failed=${gen.failed.length}`) && allPass;

  // 영속
  const res = await persistGeneratedProblems(concept.id, gen.ok);
  allPass = check(res.created === 3, '영속 created', `created=${res.created}`) && allPass;

  // 읽기 검증 — 본문/보기/해설/정답 컬럼 + 배치축
  const rows = await prisma.labProblem.findMany({ where: { id: { in: res.problemIds } } });
  const mc = rows.find((r) => r.type === 'MULTIPLE_CHOICE');
  const sa = rows.find((r) => r.type === 'SHORT_ANSWER');
  const de = rows.find((r) => r.type === 'DESCRIPTIVE');

  allPass = check(!!mc?.body && Array.isArray(mc?.choices) && (mc!.choices as string[]).length === 5, '객관식 body+choices(5) 영속', `choices=${JSON.stringify(mc?.choices)}`) && allPass;
  allPass = check((mc?.answer as { choice?: number })?.choice === 2, '객관식 answer.choice', JSON.stringify(mc?.answer)) && allPass;
  allPass = check((sa?.answer as { value?: string })?.value === '$6$' && sa?.choices === null, '단답 answer.value + choices null', JSON.stringify(sa?.answer)) && allPass;
  allPass = check(!!(de?.answer as { rubric?: string })?.rubric && de?.choices === null, '서술형 rubric + choices null', JSON.stringify(de?.answer)) && allPass;
  allPass = check(rows.every((r) => !!r.explanation), '해설 영속', `${rows.filter((r) => r.explanation).length}/3`) && allPass;
  allPass = check(rows.every((r) => r.isGenerated && r.conceptId === concept.id && r.bodyRef === 'inline'), '배치축 conceptId×isGenerated + bodyRef 센티넬', `concept=${concept.id}`) && allPass;

  // supplier 조회축 호환 — manual-supplier가 쓰는 (conceptId, difficulty)로 잡히나
  const supplied = await prisma.labProblem.findMany({ where: { conceptId: concept.id, difficulty: 2, id: { in: res.problemIds } } });
  allPass = check(supplied.length === 1, 'supplier 조회축(conceptId+difficulty) 호환', `found=${supplied.length}`) && allPass;

  // 정리 — 테스트행 삭제(데모 DB 오염 방지)
  await prisma.labProblem.deleteMany({ where: { id: { in: res.problemIds } } });
  const left = await prisma.labProblem.count({ where: { id: { in: res.problemIds } } });
  allPass = check(left === 0, '정리(테스트행 삭제)', `남음=${left}`) && allPass;

  line();
  console.log(allPass ? '🎉 토대3 영속 글루 PASS — 생성→LabProblem 배치 닫힘' : '❌ FAIL');
  line();
  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
