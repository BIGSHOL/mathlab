import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM, findCommonMistakes, GRADE_CONNECTIONS, KILLER_QUESTION_TYPES } from '../src/lib/exam-analysis/data/curriculumStrategies';

const all = [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM];
const topicNames: string[] = [];
for (const c of all) for (const u of c.units) for (const t of u.topics) topicNames.push(t.keywords[0]);

// 1. 흔한 실수
let cm = 0; const cmFail: string[] = [];
for (const n of topicNames) {
  const r = findCommonMistakes(n);
  if (r?.mistakes?.length) cm++; else cmFail.push(n);
}

// 2. 학년 연계
const connTopics = new Set<string>();
for (const c of GRADE_CONNECTIONS) { connTopics.add(c.fromTopic); c.toTopics.forEach((t: string) => connTopics.add(t)); }
let gc = 0; const gcFail: string[] = [];
for (const n of topicNames) {
  if ([...connTopics].some(ct => ct.includes(n) || n.includes(ct))) gc++; else gcFail.push(n);
}

// 3. 킬러 패턴
const killerKws = new Set<string>();
for (const k of KILLER_QUESTION_TYPES) k.keywords.forEach((kw: string) => killerKws.add(kw.toLowerCase()));
let kp = 0; const kpFail: string[] = [];
for (const n of topicNames) {
  if ([...killerKws].some(kw => n.toLowerCase().includes(kw) || kw.includes(n.toLowerCase()))) kp++; else kpFail.push(n);
}

console.log(`=== 134개 토픽 커버리지 ===\n`);
console.log(`흔한 실수: ${cm}/134 (${Math.round(cm/134*100)}%) — 미커버 ${cmFail.length}개`);
console.log(`학년 연계: ${gc}/134 (${Math.round(gc/134*100)}%) — 미커버 ${gcFail.length}개`);
console.log(`킬러 패턴: ${kp}/134 (${Math.round(kp/134*100)}%) — 미커버 ${kpFail.length}개`);

if (cmFail.length) { console.log(`\n❌ 흔한 실수 미커버:`); cmFail.forEach(f => console.log(`  ${f}`)); }
if (gcFail.length) { console.log(`\n❌ 학년 연계 미커버:`); gcFail.forEach(f => console.log(`  ${f}`)); }
if (kpFail.length) { console.log(`\n❌ 킬러 패턴 미커버:`); kpFail.forEach(f => console.log(`  ${f}`)); }
