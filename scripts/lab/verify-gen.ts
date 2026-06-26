/**
 * 🚧 Lab — 문제생성기 결정적 검증 (콘텐츠 토대 2단계, 실 API 비용 0)
 *   정규화/검증 순수로직 + 주입형(DI) 스텁으로 AI 무호출 검증.
 *   품질(실 Gemini)은 gen-sample.ts로 별도 확인.
 *
 *   실행: node --env-file=.env.local --import tsx scripts/lab/verify-gen.ts
 */
import {
  normalizeGenerated,
  generateProblem,
  generateProblemsForConcept,
  setProblemGenerator,
  resetProblemGenerator,
} from '@/lib/lab/problem-gen';
import type { GeminiGenRaw } from '@/lib/lab/ai-client';

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? '✅' : '❌'} ${label} — ${detail}`);
  ok ? pass++ : fail++;
}
const A = (o: unknown) => o as Record<string, unknown>;

async function main() {
  // [0] MC 정규화 — 보기 마커 제거 + answer {choice}
  const mc = normalizeGenerated(
    { body: '문제 $1$', choices: ['① $1$', '$2$', '$3$', '$4$', '$5$'], answerIndex: 3, explanation: '풀이' },
    'MULTIPLE_CHOICE',
    2,
  );
  check('MC 정규화', mc.choices?.length === 5 && mc.choices?.[0] === '$1$' && A(mc.answer).choice === 3,
    `보기 ${mc.choices?.length}개, 마커제거 '${mc.choices?.[0]}', choice=${A(mc.answer).choice}`);

  // [1] MC 보기 수 검증(5 아니면 throw)
  let threw = false;
  try { normalizeGenerated({ body: 'x', choices: ['a', 'b', 'c', 'd'], answerIndex: 1, explanation: '' }, 'MULTIPLE_CHOICE', 2); } catch { threw = true; }
  check('MC 보기수 검증', threw, '5개 아니면 throw');

  // [2] MC answerIndex 범위(1~5)
  threw = false;
  try { normalizeGenerated({ body: '문제', choices: ['a', 'b', 'c', 'd', 'e'], answerIndex: 9, explanation: '' }, 'MULTIPLE_CHOICE', 2); } catch { threw = true; }
  check('MC answerIndex 검증', threw, '1~5 아니면 throw');

  // [3] SHORT — \dfrac→\frac 방어 + answer {value}
  const sa = normalizeGenerated({ body: '문제 $x$', answer: '$\\dfrac{1}{2}$', explanation: '' }, 'SHORT_ANSWER', 3);
  check('SHORT 정규화 + dfrac→frac', A(sa.answer).value === '$\\frac{1}{2}$', `value='${A(sa.answer).value}'`);

  // [4] DESC — rubric을 answer.rubric으로(서술형 채점기 asText 호환)
  const d = normalizeGenerated({ body: '서술 문제입니다', rubric: '모범답안 + 채점기준', explanation: '' }, 'DESCRIPTIVE', 4);
  check('DESC 정규화', A(d.answer).rubric === '모범답안 + 채점기준', `rubric='${A(d.answer).rubric}'`);

  // [5] DI 스텁으로 generateProblem (AI 무호출, $0)
  setProblemGenerator(async (input) => ({ body: `개념 ${input.conceptName} 문제 $1$`, answer: '$1$', explanation: '풀이' }) as GeminiGenRaw);
  const g = await generateProblem({ conceptName: '테스트개념', type: 'SHORT_ANSWER', difficulty: 2 });
  check('DI 생성($0)', g.body.includes('테스트개념') && A(g.answer).value === '$1$', `body='${g.body}'`);

  // [6] 배치 — 개별 실패는 건너뛰고 ok/failed 분리
  setProblemGenerator(async (input) =>
    input.type === 'MULTIPLE_CHOICE'
      ? ({ body: 'x', choices: ['a'], answerIndex: 1, explanation: '' } as GeminiGenRaw) // 보기 1개 → 검증 실패
      : ({ body: '단답 $1$', answer: '$1$', explanation: '' } as GeminiGenRaw));
  const res = await generateProblemsForConcept({ conceptName: 'C', plan: [{ type: 'SHORT_ANSWER', difficulty: 1 }, { type: 'MULTIPLE_CHOICE', difficulty: 2 }] });
  check('배치 ok/failed 분리', res.ok.length === 1 && res.failed.length === 1, `ok=${res.ok.length}, failed=${res.failed.length}`);
  resetProblemGenerator();

  console.log(`\n${fail === 0 ? '✅ 전부 PASS' : '❌ 실패 ' + fail}  (pass ${pass} / fail ${fail})`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('❌ 스크립트 실패:', e); process.exit(1); });
