/**
 * 해설/본문/정답 전수 감사(audit) + 일괄 정리
 *
 * 적용 규칙 (순서대로):
 *  1) normalizeMathText — 후처리 정규화
 *      - fixLatexEscaping: 이스케이프 복원, literal \n, \dfrac→\frac
 *      - 수식 밖 \textrm/\text/\mathrm 제거
 *      - 인접 인라인 글루 분리 $A$$B$ → $A$ $B$
 *      - 블록 수식 다단계 = → aligned 자동 래핑
 *      - 공백/줄바꿈 정리
 *  2) normalizeAnswerField — 정답 LaTeX 자동 $...$ 래핑
 *  3) case-marker 줄바꿈 — (\textrm{i}), (i)..(x), 로마숫자, 따라서/이상에서/∴ 등
 *
 * 사용:
 *   npx tsx scripts/audit-explanations.ts              # dry-run + 통계
 *   npx tsx scripts/audit-explanations.ts --apply      # 모두 반영
 *   npx tsx scripts/audit-explanations.ts --verbose    # 변경 샘플 상세 출력
 *   npx tsx scripts/audit-explanations.ts --id <qid>   # 단일 문제
 */
import { prisma } from '../src/lib/db';
import { normalizeMathText, normalizeAnswerField } from '../src/lib/pdf-extract-engine/ai/post-processor';

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');
const ID_IDX = process.argv.indexOf('--id');
const TARGET_ID = ID_IDX >= 0 ? process.argv[ID_IDX + 1] : null;

/** 수식 보호 */
function withMathProtected(text: string, transform: (t: string) => string): string {
  const blocks: string[] = [];
  const tmp = text
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => {
      const i = blocks.push(m) - 1;
      return `\u0000M${i}\u0000`;
    })
    .replace(/\$[^$\n]*\$/g, (m) => {
      const i = blocks.push(m) - 1;
      return `\u0000M${i}\u0000`;
    });
  const out = transform(tmp);
  return out.replace(/\u0000M(\d+)\u0000/g, (_, i) => blocks[Number(i)] ?? '');
}

/** case-marker 기반 줄바꿈 */
function fixCaseMarkers(text: string): string {
  return withMathProtected(text, (t) => {
    let out = t;
    out = out.replace(/(?<=\S)\s*(\(\\textrm\{[ivxIVX]+\}\))/g, '\n$1');
    out = out.replace(/(?<=\S)\s*(\((?:i{1,3}|iv|v|vi{0,3}|ix|x)\))(?=[^a-zA-Z])/g, '\n$1');
    out = out.replace(/(?<=\S)\s*([\u2160-\u2169\u2170-\u2179])/g, '\n$1');
    for (const k of ['이상에서', '따라서', '그러므로', '즉,', '∴']) {
      out = out.replace(new RegExp(`(?<=\\S)\\s*(${k})`, 'g'), '\n$1');
    }
    out = out.replace(/(일\s*때\s*[,:])\s*(\u0000M\d+\u0000)/g, '$1\n$2');
    out = out.replace(/\n{3,}/g, '\n\n');
    out = out.replace(/[ \t]+\n/g, '\n');
    return out;
  });
}

/** 문제 검출된 이슈 플래그 */
function detectIssues(text: string): string[] {
  const issues: string[] = [];
  if (/\$[^$\n]+\$\$[^$\n]+\$/.test(text)) issues.push('adjacent_inline_glue');
  if (/\\n(?![a-zA-Z])/.test(text)) issues.push('literal_backslash_n');
  if (/\\dfrac(?![a-zA-Z])/.test(text)) issues.push('dfrac');
  // \textrm/\text/\mathrm 이 수식 밖에 있는지
  const outsideMath = text
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$\n]*\$/g, '');
  if (/\\(textrm|text|mathrm)\{/.test(outsideMath)) issues.push('textrm_outside_math');
  // 한 줄이고 >= 200자
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 1 && text.length >= 200) issues.push('long_single_line');
  // case 마커 있는데 줄 시작이 아님
  if (/\S\s*\(\\textrm\{[ivxIVX]+\}\)/.test(text)) issues.push('inline_case_marker');
  if (/\S\s*∴/.test(text)) issues.push('inline_therefore');
  return issues;
}

function preview(t: string, n = 250): string {
  return t.length > n ? t.slice(0, n) + '…' : t;
}

(async () => {
  const where: any = { isDraft: false };
  if (TARGET_ID) where.id = TARGET_ID;

  const qs = await prisma.question.findMany({
    where,
    select: { id: true, bookCode: true, questionNum: true, content: true, explanation: true, answer: true },
  });

  const issueCount: Record<string, number> = {};
  const changeByField: Record<string, number> = { content: 0, explanation: 0, answer: 0 };
  const samples: string[] = [];
  let changedCount = 0;

  for (const q of qs) {
    const updates: { content?: string; explanation?: string; answer?: string } = {};
    const reasons: string[] = [];

    // content
    if (q.content) {
      const issues = detectIssues(q.content);
      issues.forEach((r) => (issueCount[r] = (issueCount[r] || 0) + 1));
      const fixed = fixCaseMarkers(normalizeMathText(q.content));
      if (fixed !== q.content) {
        updates.content = fixed;
        changeByField.content++;
        reasons.push(`content:${issues.join(',')}`);
      }
    }

    // explanation
    if (q.explanation) {
      const issues = detectIssues(q.explanation);
      issues.forEach((r) => (issueCount[r] = (issueCount[r] || 0) + 1));
      const fixed = fixCaseMarkers(normalizeMathText(q.explanation));
      if (fixed !== q.explanation) {
        updates.explanation = fixed;
        changeByField.explanation++;
        reasons.push(`explanation:${issues.join(',')}`);
      }
    }

    // answer
    if (q.answer) {
      const fixed = normalizeAnswerField(normalizeMathText(q.answer));
      if (fixed !== q.answer) {
        updates.answer = fixed;
        changeByField.answer++;
        reasons.push('answer:latex_wrap');
      }
    }

    if (Object.keys(updates).length === 0) continue;
    changedCount++;

    if (VERBOSE && samples.length < 15) {
      const parts: string[] = [`\n── [${q.bookCode ?? '?'} #${q.questionNum ?? '?'}] ${reasons.join(' | ')} ─────`];
      for (const [field, newVal] of Object.entries(updates)) {
        const oldVal = (q as any)[field] as string;
        parts.push(`◉ ${field}`);
        parts.push(`  BEFORE: ${preview(oldVal)}`);
        parts.push(`  AFTER : ${preview(newVal as string)}`);
      }
      samples.push(parts.join('\n'));
    }

    if (APPLY) {
      await prisma.question.update({ where: { id: q.id }, data: updates });
    }
  }

  console.log(`\n=== 해설/본문/정답 전수 감사 ${APPLY ? '(DB 반영)' : '(dry-run)'} ===`);
  console.log(`대상: ${qs.length}문제, 변경: ${changedCount}문제`);
  console.log(`\n[필드별 변경]`);
  console.log(`  content     : ${changeByField.content}건`);
  console.log(`  explanation : ${changeByField.explanation}건`);
  console.log(`  answer      : ${changeByField.answer}건`);
  console.log(`\n[탐지 이슈 집계]`);
  for (const [k, v] of Object.entries(issueCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(26)} ${v}건`);
  }

  if (VERBOSE && samples.length > 0) {
    console.log('\n[변경 샘플]');
    console.log(samples.join('\n'));
  } else if (!VERBOSE && changedCount > 0) {
    console.log('\n💡 --verbose 로 변경 샘플 확인. --apply 로 실제 반영.');
  }

  process.exit(0);
})();
