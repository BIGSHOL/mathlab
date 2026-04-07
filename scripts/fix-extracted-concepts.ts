/**
 * 교과서 추출 개념 정리 — 중복 삭제 + 메타데이터 보정
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. 중복 개념 삭제 (conceptCode 없는 것 = 교과서 추출본)
  const dupes = ['소인수', '소인수분해를 이용하여 약수 구하기'];
  for (const title of dupes) {
    const c = await prisma.concept.findFirst({ where: { title, conceptCode: null } });
    if (c) {
      await prisma.blankExercise.deleteMany({ where: { conceptId: c.id } });
      await prisma.concept.delete({ where: { id: c.id } });
      console.log('삭제:', title);
    }
  }

  // 2. 에라토스테네스의 체 — 메타데이터 보정
  const era = await prisma.concept.updateMany({
    where: { title: { contains: '에라토스테네스' } },
    data: { conceptCode: 'M1-NUM-01-4', section: '소인수분해', part: 'calc', category: 'concept' },
  });
  console.log('보정 에라토스테네스:', era.count);

  // 3. 소수와 합성수 section 보정
  const sc = await prisma.concept.updateMany({
    where: { title: '소수와 합성수', conceptCode: 'M1-NUM-01-1' },
    data: { section: '소인수분해' },
  });
  console.log('보정 소수와합성수:', sc.count);

  // 확인
  const remaining = await prisma.concept.findMany({
    where: { grade: 'middle_1', chapter: '소인수분해' },
    select: { conceptCode: true, title: true, section: true, part: true },
    orderBy: { conceptCode: 'asc' },
  });
  console.log('\n소인수분해 단원 개념:');
  remaining.forEach(c => console.log(c.conceptCode, '|', c.title, '|', c.section, '|', c.part));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
