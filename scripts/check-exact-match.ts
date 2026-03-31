import {
  MIDDLE_SCHOOL_CURRICULUM,
  HIGH_SCHOOL_CURRICULUM,
  COMMON_MISTAKES,
  KILLER_QUESTION_TYPES,
} from '../src/lib/exam-analysis/data/curriculumStrategies';

// 134개 토픽명 추출
const topicNames = new Set<string>();
for (const c of [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM]) {
  for (const u of (c as any).units) {
    for (const t of u.topics) {
      topicNames.add(t.keywords[0]);
    }
  }
}
console.log('=== 기준 토픽 수:', topicNames.size);

// COMMON_MISTAKES
const cmNo = COMMON_MISTAKES.filter(c => !topicNames.has(c.unit)).map(c => c.unit);
console.log(`\n=== COMMON_MISTAKES: ${COMMON_MISTAKES.length}개 중 ${COMMON_MISTAKES.length - cmNo.length}개 매칭, ${cmNo.length}개 불일치`);
if (cmNo.length) console.log('불일치:', cmNo.join(', '));

// KILLER_QUESTION_TYPES
const kpNo = KILLER_QUESTION_TYPES.filter(k => !topicNames.has(k.unit)).map(k => k.unit);
console.log(`\n=== KILLER_QUESTION_TYPES: ${KILLER_QUESTION_TYPES.length}개 중 ${KILLER_QUESTION_TYPES.length - kpNo.length}개 매칭, ${kpNo.length}개 불일치`);
if (kpNo.length) console.log('불일치:', kpNo.join(', '));
