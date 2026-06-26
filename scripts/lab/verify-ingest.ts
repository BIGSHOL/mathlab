// 🚧 Lab 토대3 검증 — 세션 비전 인제스트 경로 (픽스처, 실 API $0). DB 테스트행 생성 후 정리.
//   run: node --env-file=.env --import tsx scripts/lab/verify-ingest.ts
import { prisma } from '@/lib/db';
import { parseIngestDoc, type IngestDoc } from '@/lib/lab/ingest';
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
  console.log('🚧 Lab 토대3 — 세션 비전 인제스트 검증 (픽스처 $0)');
  line();

  const concept = await prisma.labConcept.findFirst({ orderBy: { id: 'asc' } });
  if (!concept) throw new Error('LabConcept 없음 — seed 필요');
  const SOURCE = '[검증] 교재샘플 p.1';

  // 픽스처: 유효 3 + 무효 1(보기 4개) → 검증이 무효를 걸러내는지
  const doc: IngestDoc = {
    source: SOURCE,
    conceptId: concept.id,
    problems: [
      { type: 'MULTIPLE_CHOICE', difficulty: 2, body: '다음 중 $x+1=3$의 해는?', choices: ['$1$', '$2$', '$3$', '$4$', '$5$'], answerIndex: 2, explanation: '$x=2$' },
      { type: 'SHORT_ANSWER', difficulty: 3, body: '$2 \\times 3$의 값을 구하시오.', answer: '$6$', explanation: '곱셈' },
      { type: 'DESCRIPTIVE', difficulty: 4, body: '$\\frac{1}{2}+\\frac{1}{3}$을 풀이와 함께 구하시오.', rubric: '통분 후 합산: $\\frac{5}{6}$ (과정 3점 + 답 2점)', explanation: '통분' },
      { type: 'MULTIPLE_CHOICE', difficulty: 2, body: '보기 4개짜리(무효여야)', choices: ['$1$', '$2$', '$3$', '$4$'], answerIndex: 1, explanation: '' },
    ],
  };

  // 1) 파싱·검증 — 무효 1 걸러지고 유효 3 통과
  const parsed = parseIngestDoc(doc);
  allPass = check(parsed.problems.length === 3, '검증: 유효 3문항 통과', `ok=${parsed.problems.length}`) && allPass;
  allPass = check(parsed.errors.length === 1 && parsed.errors[0].index === 3, '검증: 무효(보기4) 1건 거름', JSON.stringify(parsed.errors)) && allPass;
  allPass = check(parsed.problems.every((p) => p.source === SOURCE), '검증: source 교재로 오버라이드', parsed.problems[0]?.source ?? '') && allPass;

  // 2) 영속 — isGenerated=false (실 교재 문제)
  const res = await persistGeneratedProblems(parsed.conceptId, parsed.problems, { isGenerated: false });
  allPass = check(res.created === 3, '영속 created', `created=${res.created}`) && allPass;

  // 3) 읽기 검증 — isGenerated=false + source + 본문/정답
  const rows = await prisma.labProblem.findMany({ where: { id: { in: res.problemIds } } });
  allPass = check(rows.every((r) => r.isGenerated === false), '인제스트 = isGenerated false(실문제)', `${rows.filter((r) => !r.isGenerated).length}/3`) && allPass;
  allPass = check(rows.every((r) => r.source === SOURCE && r.bodyRef === 'inline'), 'source(교재) + bodyRef 센티넬', SOURCE) && allPass;
  const mc = rows.find((r) => r.type === 'MULTIPLE_CHOICE');
  allPass = check(!!mc?.body && Array.isArray(mc?.choices) && (mc!.choices as string[]).length === 5 && (mc?.answer as { choice?: number })?.choice === 2, '객관식 body+choices(5)+answer 영속', JSON.stringify(mc?.answer)) && allPass;
  const de = rows.find((r) => r.type === 'DESCRIPTIVE');
  allPass = check(!!(de?.answer as { rubric?: string })?.rubric, '서술형 rubric 영속', JSON.stringify(de?.answer)) && allPass;

  // 4) 정리 — 테스트행 삭제(데모 DB 오염 방지)
  await prisma.labProblem.deleteMany({ where: { id: { in: res.problemIds } } });
  const left = await prisma.labProblem.count({ where: { id: { in: res.problemIds } } });
  allPass = check(left === 0, '정리(테스트행 삭제)', `남음=${left}`) && allPass;

  line();
  console.log(allPass ? '🎉 토대3 인제스트 경로 PASS — 세션 판독 JSON → LabProblem' : '❌ FAIL');
  line();
  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
