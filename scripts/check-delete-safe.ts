import {
  MIDDLE_SCHOOL_CURRICULUM,
  HIGH_SCHOOL_CURRICULUM,
  COMMON_MISTAKES,
  KILLER_QUESTION_TYPES,
} from '../src/lib/exam-analysis/data/curriculumStrategies';

// 134개 토픽명 추출
const topicNames: string[] = [];
for (const c of [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM]) {
  for (const u of (c as any).units) {
    for (const t of u.topics) {
      topicNames.push(t.keywords[0]);
    }
  }
}
const topicSet = new Set(topicNames);
console.log('기준 토픽:', topicNames.length, '개 (고유:', topicSet.size, ')');

// 정확 매칭 엔트리만 남겼을 때 커버리지
const cmMatching = COMMON_MISTAKES.filter(c => topicSet.has(c.unit));
const cmCovered = new Set(cmMatching.map(c => c.unit));
const cmMissing = topicNames.filter(n => !cmCovered.has(n));
console.log('\n=== COMMON_MISTAKES 삭제 후 ===');
console.log('남는 엔트리:', cmMatching.length);
console.log('커버 토픽:', cmCovered.size, '/', topicSet.size);
if (cmMissing.length) console.log('미커버:', cmMissing.join(', '));

const kpMatching = KILLER_QUESTION_TYPES.filter(k => topicSet.has(k.unit));
const kpCovered = new Set(kpMatching.map(k => k.unit));
const kpMissing = topicNames.filter(n => !kpCovered.has(n));
console.log('\n=== KILLER_QUESTION_TYPES 삭제 후 ===');
console.log('남는 엔트리:', kpMatching.length);
console.log('커버 토픽:', kpCovered.size, '/', topicSet.size);
if (kpMissing.length) console.log('미커버:', kpMissing.join(', '));
