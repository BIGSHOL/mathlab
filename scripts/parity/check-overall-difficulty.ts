/**
 * 종합 난이도 일치 검사 (적대적 리뷰 1.5).
 *
 * 강사가 보는 분석 화면과 학부모에게 공유할 총평·블로그가 같은 시험을
 * 다른 단계로 설명하면 안 된다. 세 곳이 모두 weightedAverageDifficulty 를 써야 한다.
 *
 * 실행: npx tsx scripts/parity/check-overall-difficulty.ts
 */
import { readFileSync } from 'fs';
import { isHighDifficulty, weightedAverageDifficulty } from '../../src/lib/exam-analysis/shared/difficulty';
import type { AnalyzedQuestion } from '../../src/lib/exam-analysis/types';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

// 리뷰가 제시한 재현 입력: 같은 배점 10문항 중 9개 Lv1, 1개 Lv5
const qs = Array.from({ length: 10 }, (_, i) => ({
  difficulty: i < 9 ? '1' : '5', points: 5,
})) as AnalyzedQuestion[];

const weighted = weightedAverageDifficulty(qs).avg;
const naive = [9, 0, 0, 0, 1].reduce((s, c, i) => s + c * (i + 1), 0) / 10;

console.log('── 공식 자체 ──');
console.log(`  가중(화면 기준) ${weighted.toFixed(3)} → Level ${Math.round(weighted)}`);
console.log(`  단순 문항수 평균 ${naive.toFixed(3)} → Level ${Math.round(naive)}  (옛 총평·블로그)`);
ok(Math.round(weighted) !== Math.round(naive), '두 공식이 실제로 다른 입력임 (검사 유효성)');

console.log('\n── 소비처가 공용 헬퍼를 쓰는가 ──');
const src = (p: string) => readFileSync(p, 'utf8');
const commentary = src('src/lib/exam-analysis/agents/commentary-agent.ts');
const article = src('src/lib/exam-analysis/article-generator.ts');

ok(commentary.includes('weightedAverageDifficulty('), '총평이 공용 헬퍼 사용');
ok(article.includes('weightedAverageDifficulty('), '블로그가 공용 헬퍼 사용');
ok(
  !/const overallLevel[\s\S]{0,120}reduce\(\(s, c, i\) => s \+ c \* \(i \+ 1\)/.test(commentary),
  '총평에 단순 평균 잔존 없음',
);
ok(
  !/const overallLevel[\s\S]{0,120}reduce\(\(s, c, i\) => s \+ c \* \(i \+ 1\)/.test(article),
  '블로그에 단순 평균 잔존 없음',
);

// ── 고난도 술어 단일화 (2026-08-30) ──
// `d === '4' || d === '5' || d === 'reasoning' || d === 'creative'` 가 여러 곳에 복제돼 있었고
// 복제본마다 구 키를 넣은 것/빼먹은 것이 섞여 있었다. isHighDifficulty 로 모으면서
// **동작이 바뀌지 않았음**을 증명한다 — 리팩터는 "출력이 그대로"를 보여야 한다(§12-13).
console.log('\n── 고난도 판정: 옛 복제본과 동일한 결과 ──');
{
  const legacyPredicate = (v: unknown) => {
    const d = String(v);
    return d === '4' || d === '5' || d === 'reasoning' || d === 'creative';
  };
  const samples: unknown[] = [
    '1', '2', '3', '4', '5',
    'concept', 'pattern', 'reasoning', 'creative',
    null, undefined, '', '   ', 'NaN', 'null', 'undefined',
    0, 4, 5, '6', '0', 'high', 'medium', 'low',
  ];
  const diverged = samples.filter((s) => isHighDifficulty(s) !== legacyPredicate(s));
  // String(null) === 'null' 이라 옛 술어도 false 였다 → 전 표본에서 동일해야 한다
  ok(diverged.length === 0, '전 표본에서 옛 술어와 동일', diverged.length ? JSON.stringify(diverged) : '23종 일치');

  ok(isHighDifficulty('4') && isHighDifficulty('5'), 'Lv4·Lv5 는 고난도');
  ok(isHighDifficulty('reasoning') && isHighDifficulty('creative'), '구 키 reasoning·creative 도 고난도');
  ok(!isHighDifficulty('3') && !isHighDifficulty('pattern'), 'Lv3 이하는 아님');
  ok(!isHighDifficulty(null) && !isHighDifficulty(undefined), '미판독은 고난도가 아니다 (근거 없는 경고 방지)');
  ok(!isHighDifficulty('6') && !isHighDifficulty('high'), '척도 밖 값은 고난도가 아니다');
}

console.log('\n──────────────────────────────');
if (fail) {
  console.log(`❌ ${fail}건 실패`);
  process.exit(1);
}
console.log('✅ 전부 통과 — 화면·총평·블로그가 한 공식을 쓴다');
