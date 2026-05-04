/**
 * source='textbook-rich' 개념 본문에 paragraph break 자동 삽입 후처리.
 *
 * dry-run: npx tsx scripts/reformat-textbook-rich.ts
 * apply:   npx tsx scripts/reformat-textbook-rich.ts --apply
 */
import { PrismaClient } from '@prisma/client';
import { formatRichTextbookContent } from '../src/lib/services/workbook/textbook-format';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');
  const rows = await prisma.concept.findMany({
    where: { source: 'textbook-rich' },
    select: { id: true, conceptCode: true, title: true, fullContent: true },
  });
  console.log(`📚 대상: ${rows.length}개 textbook-rich 개념\n`);

  let changed = 0;
  for (const r of rows) {
    const before = r.fullContent ?? '';
    const after = formatRichTextbookContent(before);
    if (before === after) {
      console.log(`✓ ${r.conceptCode} (${r.title}) — 변경 없음`);
      continue;
    }
    changed += 1;
    console.log(`📝 ${r.conceptCode} (${r.title})`);
    console.log(`   before len=${before.length} | after len=${after.length} | diff=+${after.length - before.length}자`);
    if (apply) {
      await prisma.concept.update({ where: { id: r.id }, data: { fullContent: after } });
    }
  }
  console.log(`\n${apply ? '✅ ' + changed + '개 업데이트 완료' : '👁  Dry-run. 적용: --apply'}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
