/**
 * 토픽 매칭 테스트 — Gemini 반환 토픽이 교육과정 DB와 매칭되는지 확인
 */
import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from '../src/lib/exam-analysis/data/curriculumStrategies';
import { findMatchingStrategies } from '../src/lib/exam-analysis/data/curriculum/strategyMatchers';

// 전체 토픽 수 확인
let totalTopics = 0;
for (const curr of [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM]) {
  for (const unit of curr.units) {
    totalTopics += unit.topics.length;
  }
}
console.log(`총 교육과정 토픽: ${totalTopics}개\n`);

// Gemini가 반환할 수 있는 토픽 (중3 + 고1)
const geminiTopics = [
  // 중3 — 실수와 그 계산
  '중3 수학 > 제곱근과 실수 > 제곱근의 뜻과 성질',
  '중3 수학 > 제곱근과 실수 > 제곱근의 곱셈과 나눗셈',
  '중3 수학 > 제곱근과 실수 > 제곱근의 덧셈과 뺄셈',
  '중3 수학 > 제곱근과 실수 > 무리수와 실수',
  '중3 수학 > 제곱근과 실수 > 제곱근의 활용',
  // 중3 — 다항식
  '중3 수학 > 다항식의 곱셈과 인수분해 > 다항식의 곱셈',
  '중3 수학 > 다항식의 곱셈과 인수분해 > 인수분해',
  '중3 수학 > 다항식의 곱셈과 인수분해 > 인수분해의 활용',
  '중3 수학 > 다항식의 곱셈과 인수분해 > 인수분해 공식',
  '중3 수학 > 다항식의 곱셈과 인수분해 > 곱셈 공식의 활용',
  // 중3 — 이차방정식
  '중3 수학 > 이차방정식 > 이차방정식의 풀이',
  '중3 수학 > 이차방정식 > 이차방정식의 활용',
  // 중3 — 이차함수
  '중3 수학 > 이차함수 > 이차함수와 그래프',
  '중3 수학 > 이차함수 > 이차함수의 활용',
  // 중3 — 삼각비/피타고라스
  '중3 수학 > 삼각비 > 삼각비',
  '중3 수학 > 삼각비 > 삼각비의 활용',
  '중3 수학 > 피타고라스 정리 > 피타고라스 정리의 활용',
  // 중3 — 원/통계
  '중3 수학 > 원의 성질 > 원주각',
  '중3 수학 > 통계 > 대푯값과 산포도',
  // 고1 — 공통수학1
  '공통수학1 > 다항식 > 다항식의 연산',
  '공통수학1 > 다항식 > 인수분해',
  '공통수학1 > 방정식과 부등식 > 이차방정식',
  '공통수학1 > 방정식과 부등식 > 여러 가지 부등식',
  // 고2 — 대수
  '대수 > 지수함수와 로그함수 > 지수함수',
  '대수 > 삼각함수 > 삼각함수의 정의',
  '대수 > 수열 > 등차수열과 등비수열',
];

console.log('=== Gemini 토픽 매칭 테스트 ===\n');
let matched = 0;
let unmatched = 0;
const failures: string[] = [];

for (const topic of geminiTopics) {
  const result = findMatchingStrategies(topic);
  const shortTopic = topic.split(' > ').pop();
  if (result) {
    matched++;
    console.log(`✅ ${shortTopic} → [${result.keywords.slice(0, 2).join(', ')}] (${result.strategies.length}개 전략)`);
  } else {
    unmatched++;
    failures.push(shortTopic || topic);
    console.log(`❌ ${shortTopic} → 매칭 실패`);
  }
}

console.log(`\n=== 결과 ===`);
console.log(`매칭: ${matched}/${geminiTopics.length} (${Math.round(matched / geminiTopics.length * 100)}%)`);
console.log(`실패: ${unmatched}`);
if (failures.length > 0) {
  console.log(`실패 목록: ${failures.join(', ')}`);
}
