// 🚧 Lab 토대3-B — 워크플로 출력 → LabProblem 일괄 인제스트 (₩0 세션비전 확대)
//   `Workflow` 태스크 출력 파일({...,result:{byConcept:{[conceptId]:[problem...]}}})을 받아
//   ① HTML 엔티티 디코딩 ② diagram JSON 문자열 파싱 ③ 개념별 검증 ④ source 멱등 영속.
//   per-page 손 전사 금지(LaTeX 백슬래시·엔티티 오류) → 출력 파일을 이 도구로 일괄 처리.
//   (INGEST.md §7 워크플로 함정 #7 패턴.)
//
//   사용:
//     node --env-file=.env --import tsx scripts/lab/ingest-workflow-output.ts <task.output> --source "교재명 [워크플로]" [--dry-run] [--replace]
//   --source   : LabProblem.source (필수, 멱등 키). 같은 source 기존행 있으면 중단(--replace로 교체).
//   --replace  : 같은 source 기존행 삭제 후 재적재(재개/재실행 누적분 정리). 워크시트 미배정 문항만 안전 — 배정분 있으면 중단.
//   --dry-run  : 검증만(DB 미기록).
import { readFileSync } from 'node:fs';
import { prisma } from '@/lib/db';
import { parseIngestDoc, type IngestProblemInput } from '@/lib/lab/ingest';
import { persistGeneratedProblems } from '@/lib/lab/persist';

/** StructuredOutput이 `<`/`>`/`&`를 엔티티로 직렬화 → 디코딩(&amp; 마지막). */
function dec(s: unknown): string {
  return typeof s === 'string'
    ? s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    : '';
}

/** result.byConcept를 출력 구조 어디에 있든 재귀 탐색. */
function findByConcept(o: unknown): Record<string, unknown[]> | null {
  if (!o || typeof o !== 'object') return null;
  const rec = o as Record<string, unknown>;
  if (rec.byConcept && typeof rec.byConcept === 'object' && !Array.isArray(rec.byConcept)) {
    return rec.byConcept as Record<string, unknown[]>;
  }
  for (const k of Object.keys(rec)) {
    const r = findByConcept(rec[k]);
    if (r) return r;
  }
  return null;
}

const norm = (s: unknown) => String(s).replace(/\s+/g, '');

/** 워크플로 에이전트가 서술형을 기출분석 관례 `ESSAY`로 줄 수 있음 → Lab enum `DESCRIPTIVE`로 정규화.
 *  그 외 타입은 그대로 통과(진짜 무효 타입은 parseIngestDoc 검증에서 걸림). */
function normType(t: unknown): IngestProblemInput['type'] {
  const s = String(t).toUpperCase().trim();
  return (s === 'ESSAY' ? 'DESCRIPTIVE' : s) as IngestProblemInput['type'];
}

/** 워크플로 problem(평면 필드 + diagram JSON 문자열) → IngestProblemInput.
 *  ⚠️ 객관식 answerIndex 보정: 에이전트가 0-based/1-based를 혼용(answerIndex=0·off-by-one) →
 *     `answer` 텍스트(신뢰 신호)가 보기와 일치하면 그 위치(1-based)로 강제 보정. 불일치 시 경고. */
function toInput(p: Record<string, unknown>): IngestProblemInput {
  const out: IngestProblemInput = {
    type: normType(p.type),
    difficulty: Number(p.difficulty),
    body: dec(p.body),
    explanation: dec(p.explanation),
  };
  if (Array.isArray(p.choices) && p.choices.length) out.choices = (p.choices as unknown[]).map(dec);

  if (out.type === 'MULTIPLE_CHOICE' && out.choices && out.choices.length) {
    const ansText = dec(p.answer);
    const pos = ansText ? out.choices.findIndex((c) => norm(c) === norm(ansText)) : -1; // 0-based
    const agentIdx = typeof p.answerIndex === 'number' ? p.answerIndex : null;
    if (pos >= 0) {
      out.answerIndex = pos + 1; // answer 텍스트 기준 1-based
      if (agentIdx !== pos + 1) {
        console.log(`    ⚠️ answerIndex 보정: agent=${agentIdx} → ${pos + 1} (answer="${ansText.slice(0, 24)}"=보기${pos + 1})`);
      }
    } else if (agentIdx && agentIdx > 0) {
      out.answerIndex = agentIdx; // 텍스트 매칭 실패 → agent값 폴백
      console.log(`    ❓ answer 텍스트("${ansText.slice(0, 24)}")가 보기와 불일치 → answerIndex=${agentIdx} 사용(수동확인 권장)`);
    }
  } else if (typeof p.answerIndex === 'number' && p.answerIndex > 0) {
    out.answerIndex = p.answerIndex;
  }

  if (p.answer && dec(p.answer).trim()) out.answer = dec(p.answer);
  if (p.rubric && dec(p.rubric).trim()) out.rubric = dec(p.rubric);
  if (typeof p.diagram === 'string' && p.diagram.trim()) {
    try { out.diagram = JSON.parse(p.diagram); } catch { /* 잘못된 도형 JSON → 생략(본문만) */ }
  }
  // 🚧 토대3-C: 문항별 provenance(에이전트 출력에 있으면)
  if (typeof p.problemNumber === 'string' && p.problemNumber.trim()) out.problemNumber = p.problemNumber.trim();
  else if (typeof p.problemNumber === 'number') out.problemNumber = String(p.problemNumber);
  if (typeof p.sourcePage === 'number' && Number.isInteger(p.sourcePage) && p.sourcePage > 0) out.sourcePage = p.sourcePage;
  else if (typeof p.sourcePage === 'string' && /^\d+$/.test(p.sourcePage.trim())) out.sourcePage = parseInt(p.sourcePage, 10);
  if (typeof p.unitLabel === 'string' && p.unitLabel.trim()) out.unitLabel = dec(p.unitLabel);
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const source = flag('--source');
  const dryRun = args.includes('--dry-run');
  const replace = args.includes('--replace');
  if (!file || !source) {
    console.error('사용: ingest-workflow-output.ts <task.output> --source "교재명 [워크플로]" [--publisher 지학사] [--source-type "소단원 종합문제"] [--author 장경윤] [--grade 중1] [--book "지학사 중학 수학1"] [--dry-run] [--replace]');
    process.exit(2);
  }
  // 🚧 토대3-C: 배치 공통 구조화 provenance
  const publisher = flag('--publisher') ?? undefined;
  const sourceType = flag('--source-type') ?? undefined;
  const provenanceBase: Record<string, unknown> = {};
  const author = flag('--author'); if (author) provenanceBase.author = author;
  const grade = flag('--grade'); if (grade) provenanceBase.grade = grade;
  const book = flag('--book'); if (book) provenanceBase.bookTitle = book;
  const sourceFile = flag('--source-file'); if (sourceFile) provenanceBase.sourceFile = sourceFile;

  const data = JSON.parse(readFileSync(file, 'utf8'));
  const byConcept = findByConcept(data);
  if (!byConcept) { console.error('❌ result.byConcept 못 찾음'); process.exit(1); }

  const concepts = Object.keys(byConcept).sort();
  console.log(`📦 출처(source): ${source}`);
  console.log(`🎯 개념 ${concepts.length}개 · 문항 ${Object.values(byConcept).reduce((s, a) => s + a.length, 0)}개\n`);

  // 멱등: 같은 source 기존행 처리
  const existing = await prisma.labProblem.count({ where: { source } });
  if (existing > 0) {
    if (!replace) {
      console.error(`⚠️ 같은 source 기존행 ${existing}개. 중복 방지로 중단 — 교체는 --replace.`);
      await prisma.$disconnect(); process.exit(1);
    }
    // 워크시트 배정된 문항이 있으면 삭제 위험 → 중단(안전)
    const linked = await prisma.labWorksheetProblem.count({ where: { problem: { source } } });
    if (linked > 0) {
      console.error(`⚠️ 같은 source 문항 중 ${linked}개가 워크시트에 배정됨 → --replace 거부(데이터 무결성). 수동 확인 필요.`);
      await prisma.$disconnect(); process.exit(1);
    }
    if (!dryRun) {
      const del = await prisma.labProblem.deleteMany({ where: { source } });
      console.log(`🧹 --replace: 기존 source ${del.count}개 삭제\n`);
    }
  }

  let created = 0;
  let failed = 0;
  for (const conceptId of concepts) {
    const inputs = (byConcept[conceptId] as Record<string, unknown>[]).map(toInput);
    let parsed;
    try {
      parsed = parseIngestDoc({ source, conceptId, problems: inputs, publisher, sourceType, provenanceBase: Object.keys(provenanceBase).length ? provenanceBase : undefined });
    } catch (e) {
      console.log(`  [${conceptId}] ❌ 문서 오류: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (parsed.errors.length) {
      failed += parsed.errors.length;
      console.log(`  [${conceptId}] ⚠️ 검증실패 ${parsed.errors.length}: ${parsed.errors.map((e) => `#${e.index} ${e.error}`).join(' | ').slice(0, 200)}`);
    }
    // FK 확인
    const exists = await prisma.labConcept.findUnique({ where: { id: conceptId }, select: { id: true } });
    if (!exists) { console.log(`  [${conceptId}] ❌ conceptId 없음(스킵)`); continue; }

    if (parsed.problems.length && !dryRun) {
      const r = await persistGeneratedProblems(conceptId, parsed.problems, { isGenerated: false });
      created += r.created;
    }
    const withDiag = parsed.problems.filter((x) => x.diagram != null).length;
    console.log(`  [${conceptId}] ${dryRun ? '검증' : '+'}${parsed.problems.length}문항 (도형 ${withDiag})`);
  }
  console.log(`\n${dryRun ? '🧪 dry-run 검증' : '✅ 영속'} 완료: ${created || Object.values(byConcept).reduce((s, a) => s + a.length, 0)}문항 (검증실패 ${failed})`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
