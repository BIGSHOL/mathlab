// 🚧 Lab 토대3 — 세션 비전 인제스트 CLI: 교재 판독 JSON → LabProblem 영속
//   세션(Claude Code)이 교재 PDF를 비전으로 읽어 작성한 인제스트 문서를 DB에 꽂는다(API ₩0).
//   사용:
//     node --env-file=.env --import tsx scripts/lab/ingest-problems.ts <doc.json> [--dry-run] [--force]
//   --dry-run : 검증만(DB 미기록).  --force : 같은 source 기존행 있어도 강행(중복 허용).
//   인제스트 문서 형식/작성 규칙은 docs/lab/INGEST.md 참조.
import { readFileSync } from 'node:fs';
import { prisma } from '@/lib/db';
import { parseIngestDoc, type IngestDoc } from '@/lib/lab/ingest';
import { persistGeneratedProblems } from '@/lib/lab/persist';

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!file) {
    console.error('사용: ingest-problems.ts <doc.json> [--dry-run] [--force]');
    process.exit(2);
  }

  // 1) 파일 읽기 + 파싱
  let doc: IngestDoc;
  try {
    doc = JSON.parse(readFileSync(file, 'utf8')) as IngestDoc;
  } catch (e) {
    console.error(`❌ JSON 읽기/파싱 실패: ${file}\n   ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  // 2) 검증 (토대2 normalizeGenerated 재사용)
  const parsed = parseIngestDoc(doc);
  console.log(`📄 출처: ${parsed.source}`);
  console.log(`🎯 개념: ${parsed.conceptId}`);
  console.log(`✅ 검증 통과: ${parsed.problems.length}문항 / ❌ 실패: ${parsed.errors.length}`);
  if (parsed.errors.length) {
    for (const e of parsed.errors) console.log(`   - #${e.index}: ${e.error}`);
  }
  if (!parsed.problems.length) {
    console.error('영속할 유효 문항 0 — 중단');
    process.exit(1);
  }

  // 3) conceptId 존재 확인 (FK 무결성 — 단원매핑 절대규칙)
  const concept = await prisma.labConcept.findUnique({ where: { id: parsed.conceptId }, select: { id: true, name: true } });
  if (!concept) {
    console.error(`❌ conceptId 없음: ${parsed.conceptId} (lab_concepts에 존재해야 함)`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`   → ${concept.name}`);

  // 4) 중복 가드 (같은 source 기존행 — 재실행 시 중복 방지)
  const existing = await prisma.labProblem.count({ where: { conceptId: parsed.conceptId, source: parsed.source } });
  if (existing > 0 && !force) {
    console.error(`⚠️ 이미 같은 출처 ${existing}문항 존재 (개념 ${parsed.conceptId}). 중복 방지로 중단 — 재인제스트는 --force.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  if (dryRun) {
    console.log('🧪 --dry-run: DB 미기록. 검증만 완료.');
    await prisma.$disconnect();
    return;
  }

  // 5) 영속 (실 교재 문제 → isGenerated=false)
  const res = await persistGeneratedProblems(parsed.conceptId, parsed.problems, { isGenerated: false });
  console.log(`💾 영속 완료: ${res.created}문항 → LabProblem (isGenerated=false, source="${parsed.source}")`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
