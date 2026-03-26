import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const concepts = await p.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { conceptCode: true, title: true, grade: true, semester: true, chapter: true, section: true, sectionSub: true, part: true, sortOrder: true, keywords: true, fullContent: true },
    orderBy: [{ grade: 'asc' }, { sortOrder: 'asc' }],
  });

  // 학년별 그룹
  const byGrade: Record<string, typeof concepts> = {};
  for (const c of concepts) {
    const key = `${c.grade}-${c.semester}`;
    if (!byGrade[key]) byGrade[key] = [];
    byGrade[key].push(c);
  }

  // 패턴 분석
  console.log('=== 초등 개념 DB 패턴 분석 ===\n');

  // 1. 코드 형식
  console.log('1. 코드 형식 샘플:');
  const samples = concepts.slice(0, 10);
  for (const c of samples) console.log(`  ${c.conceptCode} | ${c.grade} ${c.semester}학기 | ${c.title}`);

  // 2. 콘텐츠 길이 통계
  console.log('\n2. 콘텐츠 길이 (학년-학기별):');
  for (const [key, cs] of Object.entries(byGrade)) {
    const lengths = cs.map(c => c.fullContent?.length || 0).filter(l => l > 0);
    if (lengths.length === 0) continue;
    const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
    const min = Math.min(...lengths);
    const max = Math.max(...lengths);
    console.log(`  ${key}: ${cs.length}개 (콘텐츠있음: ${lengths.length}) 평균=${avg}자 최소=${min} 최대=${max}`);
  }

  // 3. 콘텐츠 구조 패턴 (잘 된 샘플 3개)
  console.log('\n3. 잘 된 콘텐츠 샘플 (200자 이상):');
  const good = concepts.filter(c => (c.fullContent?.length || 0) > 200).slice(0, 3);
  for (const c of good) {
    console.log(`\n--- ${c.conceptCode} ${c.title} (${c.fullContent!.length}자) ---`);
    console.log(c.fullContent!.substring(0, 500));
    console.log('...');
  }

  // 4. keywords 패턴
  console.log('\n4. keywords 패턴:');
  const withKw = concepts.filter(c => c.keywords && (c.keywords as string[]).length > 0).slice(0, 5);
  for (const c of withKw) {
    console.log(`  ${c.conceptCode}: ${JSON.stringify(c.keywords)}`);
  }

  // 5. part/chapter/section 매핑 패턴
  console.log('\n5. 단원 매핑 패턴 (초3-1 샘플):');
  const e3 = concepts.filter(c => c.grade === 'elementary_3' && c.semester === 1);
  for (const c of e3) {
    console.log(`  ${c.conceptCode} [sort:${c.sortOrder}] ${c.part} | ${c.chapter} | ${c.section} | ${c.sectionSub || '-'}`);
  }
}
main().then(() => p.$disconnect());
