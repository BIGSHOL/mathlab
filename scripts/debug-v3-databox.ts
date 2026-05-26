/**
 * V3 분석본의 data_box rows 실제 값 확인 — bars 막대 길이 불일치 디버깅
 *
 * 사용: npx tsx scripts/debug-v3-databox.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
dotenvConfig({ path: join(process.cwd(), '.env.local'), override: true });
dotenvConfig({ path: join(process.cwd(), '.env'), override: false });

import { prisma } from '../src/lib/db';

async function main() {
  // 최근 V3 분석본 1건
  const ext = await prisma.examAnalysisExtension.findFirst({
    where: {
      agentType: 'commentary',
      result: { path: ['blog_qa'], not: null },
    } as never,
    orderBy: { lastRunAt: 'desc' },
    include: { analysis: { include: { examPaper: { select: { title: true } } } } },
  }).catch(() => null);

  // path query 지원 안 되면 raw query
  const exts = ext ? [ext] : await prisma.examAnalysisExtension.findMany({
    where: { agentType: 'commentary' },
    orderBy: { lastRunAt: 'desc' },
    take: 3,
    include: { analysis: { include: { examPaper: { select: { title: true } } } } },
  });

  for (const e of exts) {
    const r = e.result as Record<string, unknown>;
    if (!r || !Array.isArray(r.blog_qa)) continue;
    console.log(`\n📄 ${e.analysis.examPaper.title}`);
    const qaList = r.blog_qa as Array<Record<string, unknown>>;
    qaList.forEach((qa, i) => {
      const box = qa.data_box as Record<string, unknown> | undefined;
      if (!box || box.kind !== 'bars') return;
      console.log(`\n  Q${i + 1} data_box (${box.kind}): "${box.label}"`);
      const rows = box.rows as Array<{ label: string; value: string; highlight?: boolean }>;
      rows.forEach((row) => {
        const v = parseInt(row.value, 10);
        const vFloat = parseFloat(row.value);
        const numMatch = String(row.value).match(/\d+(?:\.\d+)?/);
        console.log(`    label="${row.label}" value="${row.value}" parseInt=${v} parseFloat=${vFloat} regex=${numMatch?.[0]} highlight=${row.highlight}`);
      });
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
