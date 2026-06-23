// 🚧 Lab 토대3-C — 기존 LabProblem provenance 백필
//   레거시 자유텍스트 `source`를 파싱해 publisher/sourceType/provenance(author·grade)를 채운다.
//   page는 source에 없어 미설정(이후 재추출 시 보강). 멱등: 이미 publisher 채워진 행은 스킵(--force로 재처리).
//   사용: node --env-file=.env.local --import tsx scripts/lab/backfill-provenance.ts [--apply] [--force]
import { prisma } from '@/lib/db';

const TYPE_KEYWORDS = [
  '소단원 종합문제', '소단원종합문제', '소단원 형성평가', '소단원평가', '중단원평가',
  '대단원평가', '대단원 종합문제', '형성평가', '소단원학습지', '단원마무리', '해결해요', '종합문제',
];

function parseSource(source: string | null): {
  publisher?: string; author?: string; sourceType?: string; grade?: string;
} {
  if (!source) return {};
  if (source === 'synthetic-seed') return { sourceType: '합성(시드)' };
  if (source.startsWith('토대')) return { sourceType: '토대 검증' };

  let publisher: string | undefined;
  if (/지학사/.test(source)) publisher = '지학사';
  else if (/동아/.test(source)) publisher = '동아';
  else if (/미래엔/.test(source)) publisher = '미래엔';
  else if (/천재/.test(source)) publisher = '천재';

  // 저자: 괄호 안 한글 2~4자 (예: "(장경윤)", "(강옥기, 22개정)")
  const am = source.match(/\(([가-힣]{2,4})(?:[,)]|\s)/);
  const author = am ? am[1] : undefined;

  const gm = source.match(/중\s*([1-3])/);
  const grade = gm ? `중${gm[1]}` : undefined;

  let sourceType: string | undefined;
  for (const t of TYPE_KEYWORDS) if (source.includes(t)) { sourceType = t; break; }

  return { publisher, author, sourceType, grade };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  const rows = await prisma.labProblem.findMany({
    where: force ? {} : { publisher: null },
    select: { id: true, source: true, publisher: true, sourceType: true },
  });
  console.log(`${force ? '전체' : 'publisher 미설정'} ${rows.length}개 대상\n`);

  const counts: Record<string, number> = {};
  let updated = 0;
  for (const r of rows) {
    const p = parseSource(r.source);
    const key = `${p.publisher ?? '(없음)'} · ${p.sourceType ?? '(미상)'}`;
    counts[key] = (counts[key] ?? 0) + 1;
    if (apply) {
      const provenance: Record<string, unknown> = {};
      if (p.author) provenance.author = p.author;
      if (p.grade) provenance.grade = p.grade;
      await prisma.labProblem.update({
        where: { id: r.id },
        data: {
          publisher: p.publisher ?? null,
          sourceType: p.sourceType ?? null,
          provenance: Object.keys(provenance).length ? provenance : undefined,
        },
      });
      updated++;
    }
  }
  console.log('파싱 결과 분포:');
  for (const [k, c] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(3)}  ${k}`);
  console.log(`\n${apply ? `✅ ${updated}개 업데이트` : '🧪 dry-run (적용은 --apply)'}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
