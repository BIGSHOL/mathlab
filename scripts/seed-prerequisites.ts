/**
 * ConceptPrerequisite만 빠르게 시딩하는 스크립트
 * seed-concepts.ts에서 선수학습 관계 부분만 추출
 */
import { PrismaClient } from '@prisma/client';
import { ALL_CONCEPTS } from '../src/lib/constants/concepts';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Seeding Prerequisites Only ===');

  // 1. conceptCode → DB ID 매핑
  const concepts = await prisma.concept.findMany({
    where: { conceptCode: { not: null } },
    select: { id: true, conceptCode: true },
  });
  const conceptIdMap = new Map(concepts.map(c => [c.conceptCode!, c.id]));
  console.log(`Loaded ${conceptIdMap.size} concepts from DB`);

  // 2. 기존 선수학습 관계 삭제
  const deleted = await prisma.conceptPrerequisite.deleteMany();
  console.log(`Deleted ${deleted.count} existing prerequisite records`);

  // 3. 새로 생성
  let created = 0;
  let skipped = 0;
  for (const c of ALL_CONCEPTS) {
    const conceptId = conceptIdMap.get(c.id);
    if (!conceptId || c.prerequisites.length === 0) continue;

    for (const prereqCode of c.prerequisites) {
      const prereqId = conceptIdMap.get(prereqCode);
      if (!prereqId) {
        skipped++;
        continue;
      }

      try {
        await prisma.conceptPrerequisite.create({
          data: { conceptId, prerequisiteId: prereqId },
        });
        created++;
      } catch {
        // unique constraint violation = already exists, skip
      }
    }
  }

  console.log(`Created ${created} prerequisite relationships (skipped ${skipped} missing concepts)`);

  // 4. 검증
  const total = await prisma.conceptPrerequisite.count();
  console.log(`Total ConceptPrerequisite records: ${total}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
