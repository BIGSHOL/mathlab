/**
 * 현재 DB 520개 개념이 새 dedupe 규칙을 통과하는지 검증
 */
import { PrismaClient } from '@prisma/client';
import { normalizeTitle } from '../src/lib/concept-dedupe';

const db = new PrismaClient();

async function main() {
  const all = await db.concept.findMany({
    select: { id: true, title: true, grade: true, chapter: true, section: true },
  });

  // Layer A (grade+chapter+section+normalizedTitle) 중복
  const keyA = new Map<string, { id: string; title: string }[]>();
  // Layer B (grade+chapter+normalizedTitle) — grade/chapter 모두 존재해야 적용
  const keyB = new Map<string, { id: string; title: string; section: string | null }[]>();

  for (const c of all) {
    const nt = normalizeTitle(c.title);
    const kA = `${c.grade || ''}||${c.chapter || ''}||${c.section || ''}||${nt}`;
    (keyA.get(kA) || keyA.set(kA, []).get(kA)!).push({ id: c.id, title: c.title });
    if (c.grade && c.chapter) {
      const kB = `${c.grade}||${c.chapter}||${nt}`;
      (keyB.get(kB) || keyB.set(kB, []).get(kB)!).push({ id: c.id, title: c.title, section: c.section });
    }
  }

  const dupA = [...keyA.entries()].filter(([, v]) => v.length > 1);
  const dupB = [...keyB.entries()].filter(([, v]) => v.length > 1);

  console.log(`총 개념: ${all.length}`);
  console.log(`Layer A (확정 중복) 그룹: ${dupA.length}`);
  console.log(`Layer B (유력 중복, grade+chapter+title) 그룹: ${dupB.length}`);

  if (dupA.length > 0) {
    console.log('\n⚠️ Layer A — force로도 우회 불가. 수동 정리 필요:');
    dupA.slice(0, 10).forEach(([k, v]) => {
      console.log(`  [${v.length}] ${k}`);
      v.forEach((x) => console.log(`    - ${x.id.slice(0, 8)} "${x.title}"`));
    });
  }
  if (dupB.length > 0) {
    console.log('\n📋 Layer B — 향후 유사 저장 시 force 필요:');
    dupB.slice(0, 10).forEach(([k, v]) => {
      console.log(`  [${v.length}] ${k}`);
      v.forEach((x) => console.log(`    - "${x.title}" / section=${x.section || '-'}`));
    });
  }
}

main().catch(console.error).finally(() => db.$disconnect());
