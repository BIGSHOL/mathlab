import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from '../src/lib/exam-analysis/data/curriculumStrategies';

const all = [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM];
const byGrade: Record<string, { unitName: string; topics: string[] }[]> = {};

for (const c of all) {
  const key = c.grade + ' ' + c.semester;
  if (!byGrade[key]) byGrade[key] = [];
  for (const u of c.units) {
    byGrade[key].push({ unitName: u.name, topics: u.topics.map((t: any) => t.keywords[0]) });
  }
}

for (const [grade, units] of Object.entries(byGrade)) {
  console.log(`=== ${grade} ===`);
  for (const u of units) console.log(`- ${u.unitName}: ${u.topics.join(', ')}`);
  console.log('');
}
