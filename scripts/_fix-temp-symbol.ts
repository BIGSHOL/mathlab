import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const c = await p.concept.findFirst({
    where: { conceptCode: 'M1-NUM-03-1' },
    select: { id: true, fullContent: true },
  });
  if (!c) { console.log('not found'); return; }

  let fixed = c.fullContent!;

  // $5$°C → $5$℃, $+5$°C → $+5$℃, $-3$°C → $-3$℃
  fixed = fixed.replace(/°C/g, '℃');

  console.log('수정 후:');
  const lines = fixed.split('\n').filter(l => l.includes('영상'));
  lines.forEach(l => console.log('  ' + l));

  await p.concept.update({ where: { id: c.id }, data: { fullContent: fixed } });
  console.log('완료');
}
main().then(() => p.$disconnect());
