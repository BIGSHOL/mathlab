/**
 * 능력 영역별 배점 분해 회귀 검사.
 *
 * ## 왜 있는가
 * `ability_domain` 은 시험지 분석 때 문항마다 생성돼 저장되는데 학습 대책 탭에서 한 번도
 * 쓰이지 않았다. 이제 쓰기 시작했으므로, 레이더 차트와 **같은 정규화·같은 축**을 쓰는지
 * 고정한다. 두 화면이 같은 시험을 다르게 세면 사용자는 어느 쪽을 믿어야 할지 모른다(§12-4).
 *
 * 실행: npx tsx scripts/parity/check-ability-breakdown.ts
 */
import {
  buildAbilityBreakdown,
  dominantAbility,
} from '../../src/lib/exam-analysis/shared/ability-breakdown';
import { countAbilities } from '../../src/lib/exam-analysis/shared/chart-axes';
import type { AnalyzedQuestion } from '../../src/lib/exam-analysis/types';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

function q(p: Partial<AnalyzedQuestion>): AnalyzedQuestion {
  return {
    question_number: 1, question_format: null, difficulty: null, difficulty_reason: null,
    question_type: null, points: null, topic: null, ai_comment: null,
    confidence: 0.9, confidence_reason: null,
    is_correct: null, student_answer: null, earned_points: null, error_type: null,
    ...p,
  };
}

/** 실측 분포 (경명여중1, 22문항 100점 — 2026-08-30) */
const GYEONGMYEONG: AnalyzedQuestion[] = [
  ...Array.from({ length: 7 }, (_, i) => q({ question_number: 100 + i, ability_domain: 'problem_solving', points: 45 / 7 })),
  ...Array.from({ length: 9 }, (_, i) => q({ question_number: 200 + i, ability_domain: 'understanding', points: 32 / 9 })),
  ...Array.from({ length: 4 }, (_, i) => q({ question_number: 300 + i, ability_domain: 'calculation', points: 15 / 4 })),
  ...Array.from({ length: 2 }, (_, i) => q({ question_number: 400 + i, ability_domain: 'reasoning', points: 4 })),
];

console.log('── ① 없을 때 ──');
{
  const b = buildAbilityBreakdown('MATH', []);
  ok(b.groups.length === 0 && b.absent.length === 0, '빈 입력 → 빈 결과 (축을 0으로 채우지 않음)');
  ok(b.totalPoints === 0 && b.totalQuestions === 0, '합계 0');
  ok(dominantAbility(b) === null, '쏠림 없음 → null');
}

console.log('\n── ② 배점 큰 순 정렬 ──');
{
  const b = buildAbilityBreakdown('MATH', GYEONGMYEONG);
  ok(
    b.groups.map((g) => g.domain).join(',') === 'problem_solving,understanding,calculation,reasoning',
    '문제해결력 → 이해력 → 계산력 → 추론력',
    b.groups.map((g) => `${g.domain}:${g.points}`).join(' '),
  );
  ok(b.groups[0].questionCount === 7 && b.groups[1].questionCount === 9, '문항 수가 아니라 배점 기준 (9문항이 2위)');
}

console.log('\n── ③ 퍼센트 합은 정확히 100 ──');
{
  const b = buildAbilityBreakdown('MATH', GYEONGMYEONG);
  const sum = b.groups.reduce((s, g) => s + g.percent, 0);
  ok(sum === 100, '합 100', String(sum));
  ok(b.groups[0].percent === 45, '문제해결력 45%', String(b.groups[0].percent));
}
{
  // 반올림이 어긋나기 쉬운 3등분 — 33+33+33=99 가 되면 안 된다
  const thirds = [
    q({ question_number: 1, ability_domain: 'calculation', points: 10 }),
    q({ question_number: 2, ability_domain: 'understanding', points: 10 }),
    q({ question_number: 3, ability_domain: 'reasoning', points: 10 }),
  ];
  const b = buildAbilityBreakdown('MATH', thirds);
  ok(b.groups.reduce((s, g) => s + g.percent, 0) === 100, '3등분도 합 100 (최대잉여법)');
}

console.log('\n── ④ 안 나온 영역을 알려준다 ──');
{
  const b = buildAbilityBreakdown('MATH', [
    q({ question_number: 1, ability_domain: 'calculation', points: 5 }),
  ]);
  ok(b.groups.length === 1, '나온 영역만 groups 에');
  ok(b.absent.length === 3, '나머지 3개는 absent', b.absent.map((a) => a.label).join(','));
  ok(b.absent.every((a) => a.label && a.label !== a.domain), 'absent 도 한글 라벨을 가진다');
}

console.log('\n── ⑤ 레이더 차트와 같은 축·같은 정규화 ──');
{
  // AI 변형 표기 — 모양만 소문자화하면 존재하지 않는 축으로 떨어져 사라진다(§12-3)
  const variants = [
    q({ question_number: 1, ability_domain: 'CALCULATION', points: 5 }),
    q({ question_number: 2, ability_domain: 'Problem-Solving', points: 5 }),
    q({ question_number: 3, ability_domain: 'problem_solving', points: 5 }),
  ];
  const b = buildAbilityBreakdown('MATH', variants);
  const counts = countAbilities('MATH', variants);
  ok(b.totalQuestions === 3, '변형 표기도 전부 계상됨 (누락 0)', String(b.totalQuestions));
  for (const g of b.groups) {
    ok(g.questionCount === counts[g.domain], `${g.label}: 차트 집계와 일치 (${g.questionCount})`);
  }
}

console.log('\n── ⑥ 과목별 축이 다르다 ──');
{
  const en = buildAbilityBreakdown('ENGLISH', [
    q({ question_number: 1, ability_domain: 'expression', points: 6 }),
    q({ question_number: 2, ability_domain: 'accuracy', points: 3 }),
  ]);
  ok(en.groups.map((g) => g.label).join(',') === '표현력,정확성', '영어 라벨', en.groups.map((g) => g.label).join(','));
  const ma = buildAbilityBreakdown('MATH', [q({ question_number: 1, ability_domain: 'calculation', points: 3 })]);
  ok(ma.groups[0].label === '계산력', '수학 라벨');
  ok(en.absent.length === 2 && ma.absent.length === 3, '축 개수는 과목마다 다르다');
}

console.log('\n── ⑦ 근거는 소견 있는 문항만 ──');
{
  const b = buildAbilityBreakdown('MATH', [
    q({ question_number: 1, ability_domain: 'calculation', points: 5, ai_comment: '있음' }),
    q({ question_number: 2, ability_domain: 'calculation', points: 5 }),
  ]);
  ok(b.groups[0].questionCount === 2, '문항 수는 2');
  ok(b.groups[0].evidence.length === 1, '근거는 1개 (소견 없는 문항은 빠짐)');
}

console.log('\n── ⑧ 쏠림 판정 ──');
{
  const skew = buildAbilityBreakdown('MATH', [
    q({ question_number: 1, ability_domain: 'problem_solving', points: 60 }),
    q({ question_number: 2, ability_domain: 'calculation', points: 40 }),
  ]);
  ok(dominantAbility(skew)?.domain === 'problem_solving', '60% → 쏠림 인정');

  const even = buildAbilityBreakdown('MATH', [
    q({ question_number: 1, ability_domain: 'problem_solving', points: 30 }),
    q({ question_number: 2, ability_domain: 'calculation', points: 25 }),
    q({ question_number: 3, ability_domain: 'understanding', points: 25 }),
    q({ question_number: 4, ability_domain: 'reasoning', points: 20 }),
  ]);
  ok(dominantAbility(even) === null, '30% 최고 → 쏠림 없음 (없는 쏠림을 만들지 않는다)');
}

console.log('\n── ⑨ 배점을 모르는 시험지 ──');
{
  // 배점이 전부 null 이면 나눗셈이 0/0 이 된다 — NaN 이 화면에 나가면 안 된다
  const b = buildAbilityBreakdown('MATH', [
    q({ question_number: 1, ability_domain: 'calculation' }),
    q({ question_number: 2, ability_domain: 'reasoning' }),
  ]);
  ok(b.groups.every((g) => Number.isFinite(g.percent)), 'percent 가 NaN 이 아니다');
  ok(b.groups.every((g) => g.percent === 0), '배점 모름 → 0% (임의 배분하지 않음)');
  ok(b.totalQuestions === 2, '문항 수는 그대로 센다');
  ok(dominantAbility(b) === null, '배점을 모르면 쏠림도 없다');
}

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
