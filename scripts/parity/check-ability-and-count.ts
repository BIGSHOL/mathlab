/**
 * 능력 축 집계 + 학습팩 count 계약 검사 (적대적 리뷰 1.6 / 1.7).
 *
 * 1.6 — count 는 "표현이 등장한 **문항 수**". 한 문항이 같은 단어를 대소문자 달리
 *       두 번 담고 있어도 1이어야 한다.
 * 1.7 — 차트 능력 집계가 공용 정규화기를 거쳐야 한다. 모양만 소문자화하면
 *       AI가 뱉은 수학 레거시 값이 존재하지 않는 축으로 떨어져 그냥 사라진다.
 *
 * 실행: npx tsx scripts/parity/check-ability-and-count.ts
 */
import { countAbilities, getAbilityAxes } from '../../src/lib/exam-analysis/shared/chart-axes';
import { normalizeAbilityDomain } from '../../src/lib/exam-analysis/shared/subject';
import { buildEnglishStudyFromQuestions } from '../../src/lib/exam-analysis/english-study-pack';
import type { AnalyzedQuestion } from '../../src/lib/exam-analysis/types';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

console.log('── 1.6 count = 문항 수 ──');
const dup = [{
  question_number: 1, difficulty: '2',
  key_vocab: [{ word: 'however', meaning: 'x' }, { word: 'However', meaning: 'x' }],
  key_structures: [{ pattern: 'too ~ to', meaning: 'x' }, { pattern: 'TOO ~ TO', meaning: 'x' }],
}] as unknown as AnalyzedQuestion[];
const p1 = buildEnglishStudyFromQuestions(dup)!;
ok(p1.vocab[0]?.count === 1, '한 문항 안 대소문자 중복 → 1', String(p1.vocab[0]?.count));
ok(p1.structures[0]?.count === 1, '구문도 동일', String(p1.structures[0]?.count));

const twoQ = [
  { question_number: 1, difficulty: '2', key_vocab: [{ word: 'however', meaning: 'x' }] },
  { question_number: 2, difficulty: '3', key_vocab: [{ word: 'However', meaning: 'x' }] },
] as unknown as AnalyzedQuestion[];
ok(buildEnglishStudyFromQuestions(twoQ)!.vocab[0]?.count === 2, '서로 다른 두 문항 → 2 (합산은 유지)');

console.log('\n── 1.7 능력 축 집계 == 정규화기 ──');
const cq = [
  { ability_domain: 'Problem-Solving', question_type: 'writing' },
  { ability_domain: 'CALCULATION', question_type: 'grammar' },
  { ability_domain: null, question_type: 'reading' },
] as unknown as AnalyzedQuestion[];

for (const subject of ['ENGLISH', 'MATH'] as const) {
  const viaChart = countAbilities(subject, cq);
  const viaNorm: Record<string, number> = {};
  for (const a of getAbilityAxes(subject)) viaNorm[a.key] = 0;
  for (const q of cq) {
    const d = normalizeAbilityDomain(subject, q.ability_domain, q.question_type);
    if (d && d in viaNorm) viaNorm[d] += 1;
  }
  const same = JSON.stringify(viaChart) === JSON.stringify(viaNorm);
  ok(same, `${subject}: 차트 집계 == 정규화기`, JSON.stringify(viaChart));
}
// 영어에서 수학 레거시 값이 버려지지 않는가
const en = countAbilities('ENGLISH', cq);
ok((en.expression || 0) > 0, "영어: 'Problem-Solving' → expression 으로 살아남음", JSON.stringify(en));
ok((en.accuracy || 0) > 0, "영어: 'CALCULATION' → accuracy 로 살아남음");

console.log('\n──────────────────────────────');
if (fail) {
  console.log(`❌ ${fail}건 실패`);
  process.exit(1);
}
console.log('✅ 전부 통과');
