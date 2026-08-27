/**
 * 종합 난이도 일치 검사 (적대적 리뷰 1.5).
 *
 * 강사가 보는 분석 화면과 학부모에게 공유할 총평·블로그가 같은 시험을
 * 다른 단계로 설명하면 안 된다. 세 곳이 모두 weightedAverageDifficulty 를 써야 한다.
 *
 * 실행: npx tsx scripts/parity/check-overall-difficulty.ts
 */
import { readFileSync } from 'fs';
import { weightedAverageDifficulty } from '../../src/lib/exam-analysis/shared/difficulty';
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

console.log('\n──────────────────────────────');
if (fail) {
  console.log(`❌ ${fail}건 실패`);
  process.exit(1);
}
console.log('✅ 전부 통과 — 화면·총평·블로그가 한 공식을 쓴다');
