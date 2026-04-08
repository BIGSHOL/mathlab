import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // 전체 bookCode별 문제 수
  const allBooks = await db.question.groupBy({
    by: ['bookCode', 'source'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('=== 전체 bookCode/source 그룹 ===');
  for (const r of allBooks) {
    console.log(`bookCode: ${r.bookCode} | source: ${r.source ?? '(없음)'} | count: ${r._count.id}`);
  }

  // 중1 관련 (bookCode가 M1 또는 1-1, 1-2 등)
  const middle1Codes = allBooks.filter(r =>
    r.bookCode?.startsWith('M1') ||
    r.bookCode === '1-1' || r.bookCode === '1-2' ||
    r.source?.includes('중1') || r.source?.includes('교과서')
  );
  console.log('\n=== 중1 관련 추정 ===');
  for (const r of middle1Codes) {
    console.log(`bookCode: ${r.bookCode} | source: ${r.source ?? '(없음)'} | count: ${r._count.id}`);
  }

  // 해설 없는 문제 통계 (전체)
  const total = await db.question.count();
  const noExpl = await db.question.count({
    where: { OR: [{ explanation: null }, { explanation: '' }] }
  });
  console.log(`\n전체: ${total}개, 해설 없음: ${noExpl}개 (${total ? Math.round(noExpl / total * 100) : 0}%)`);

  // bookCode별 해설 없는 문제 수
  const noExplByBook = await db.question.groupBy({
    by: ['bookCode'],
    _count: { id: true },
    where: { OR: [{ explanation: null }, { explanation: '' }] },
    orderBy: { _count: { id: 'desc' } }
  });
  console.log('\n=== bookCode별 해설 없음 ===');
  for (const r of noExplByBook) {
    const bookTotal = allBooks.filter(b => b.bookCode === r.bookCode).reduce((s, b) => s + b._count.id, 0);
    console.log(`bookCode: ${r.bookCode} | 해설없음: ${r._count.id}/${bookTotal}`);
  }

  await db.$disconnect();
}

main();
