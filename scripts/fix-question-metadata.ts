import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. bookCode 정규화
  const bookFixes: Record<string, string> = { 'M1': '1-1', 'M2': '2-1', 'M3': '3-1' };
  for (const [old, nw] of Object.entries(bookFixes)) {
    const r = await prisma.question.updateMany({ where: { bookCode: old }, data: { bookCode: nw } });
    if (r.count > 0) console.log(`bookCode ${old} → ${nw}: ${r.count}개`);
  }

  // 2. sourceTag 채우기 (null인 것들)
  // RPM 출처 → 'RPM'
  const rpm = await prisma.question.updateMany({
    where: { source: { contains: 'RPM' }, sourceTag: null },
    data: { sourceTag: 'RPM' },
  });
  if (rpm.count > 0) console.log(`RPM sourceTag: ${rpm.count}개`);

  // 기출 출처 → '기출'
  const exam = await prisma.question.updateMany({
    where: { source: { contains: '중간고사' }, sourceTag: null },
    data: { sourceTag: '기출' },
  });
  if (exam.count > 0) console.log(`기출 sourceTag: ${exam.count}개`);

  const exam2 = await prisma.question.updateMany({
    where: { source: { contains: '기말고사' }, sourceTag: null },
    data: { sourceTag: '기출' },
  });
  if (exam2.count > 0) console.log(`기출2 sourceTag: ${exam2.count}개`);

  // AI 생성 → 'AI 생성'
  const ai = await prisma.question.updateMany({
    where: { sourceTag: null, source: null },
    data: { sourceTag: 'AI 생성' },
  });
  if (ai.count > 0) console.log(`AI 생성 sourceTag: ${ai.count}개`);

  // 나머지 null → '미분류'
  const rest = await prisma.question.updateMany({
    where: { sourceTag: null },
    data: { sourceTag: '미분류' },
  });
  if (rest.count > 0) console.log(`미분류 sourceTag: ${rest.count}개`);

  // 확인
  const tags = await prisma.question.groupBy({ by: ['sourceTag'], _count: true, orderBy: { _count: { sourceTag: 'desc' } } });
  console.log('\nsourceTag 분포:');
  tags.forEach(t => console.log(`  ${t._count} | ${t.sourceTag}`));

  const books = await prisma.question.groupBy({ by: ['bookCode'], _count: true, orderBy: { _count: { bookCode: 'desc' } } });
  console.log('\nbookCode 분포:');
  books.forEach(b => console.log(`  ${b._count} | ${b.bookCode}`));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
