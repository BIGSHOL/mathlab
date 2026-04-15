import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const total = await db.concept.count();
  const all = await db.concept.findMany({
    select: { id: true, title: true, grade: true, chapter: true, section: true, sectionSub: true, subjectId: true, createdAt: true },
  });

  const byTitle: Record<string, typeof all> = {};
  for (const c of all) {
    (byTitle[c.title] ||= []).push(c);
  }
  const dupTitle = Object.entries(byTitle).filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);

  const byKey: Record<string, typeof all> = {};
  for (const c of all) {
    const k = `${c.grade}|${c.chapter}|${c.section || ''}|${c.title}`;
    (byKey[k] ||= []).push(c);
  }
  const dupKey = Object.entries(byKey).filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);

  console.log('총 개념:', total);
  console.log('동일 title 중복 그룹:', dupTitle.length, '| 중복개념 총합:', dupTitle.reduce((a, [, v]) => a + v.length, 0));
  console.log('동일 grade+chapter+section+title 중복 그룹:', dupKey.length, '| 중복개념 총합:', dupKey.reduce((a, [, v]) => a + v.length, 0));

  console.log('\n=== title만 기준 상위 15 ===');
  dupTitle.slice(0, 15).forEach(([t, v]) => console.log(`  [${v.length}] ${t}`));

  console.log('\n=== title 중복 상세 (왜 중복되는지) ===');
  for (const [t, v] of dupTitle) {
    console.log(`\n▶ "${t}" (${v.length}개)`);
    for (const c of v) {
      console.log(`    ${c.id.slice(0,8)}  grade=${c.grade}  ch=${c.chapter}  sec=${c.section||'-'}  subSec=${c.sectionSub||'-'}`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
