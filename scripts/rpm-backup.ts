import { prisma } from '../src/lib/db';
import { writeFileSync } from 'fs';

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: {
      id: true,
      questionNum: true,
      answer: true,
      explanation: true,
      scoringCriteria: true,
    },
    orderBy: { questionNum: 'asc' },
  });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const path = `D:/mathlab/rpm-backup-${timestamp}.json`;
  writeFileSync(path, JSON.stringify({ count: qs.length, backedUpAt: timestamp, questions: qs }, null, 2), 'utf-8');
  console.log(`✅ 백업 완료: ${qs.length}건 → ${path}`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
