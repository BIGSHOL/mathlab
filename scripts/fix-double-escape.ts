/**
 * 문제은행 백슬래시 이중 이스케이프 탐지 및 수정
 *
 * 문제: PDF 추출 시 LaTeX 백슬래시가 이중 이스케이프됨
 *   - content/answer/explanation: \\overline → \overline (2→1)
 *   - choices (JSON 배열 내부):    \\overline → \overline (2→1)
 *
 * 사용법:
 *   npx tsx scripts/fix-double-escape.ts              # 스캔만
 *   npx tsx scripts/fix-double-escape.ts --fix        # 수정 미리보기
 *   npx tsx scripts/fix-double-escape.ts --fix --apply  # 실제 적용
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const FIX = args.includes('--fix');
const APPLY = args.includes('--apply');

// 이중 이스케이프된 LaTeX 명령어 수정: \\cmd → \cmd
function fixDoubleEscape(text: string): string {
  // \\overline → \overline 등 (이중 백슬래시 → 단일)
  // 단, \\\\가 아닌 \\만 대상 (4중은 이미 2중에서 내려옴)
  return text.replace(/\\\\(?=[a-zA-Z])/g, '\\');
}

async function main() {
  console.log('🔍 백슬래시 이중 이스케이프 탐지\n');

  // content에서 \\ + 알파벳 (= 이중 이스케이프) 패턴 검색
  // PostgreSQL에서 \\\\ 는 리터럴 \\
  const brokenIds: { id: string }[] = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT id FROM "Question"
    WHERE content LIKE '%\\\\overline%'
       OR content LIKE '%\\\\frac%'
       OR content LIKE '%\\\\sqrt%'
       OR content LIKE '%\\\\angle%'
       OR content LIKE '%\\\\triangle%'
       OR content LIKE '%\\\\times%'
       OR content LIKE '%\\\\cdot%'
       OR content LIKE '%\\\\text%'
       OR content LIKE '%\\\\pi%'
       OR content LIKE '%\\\\left%'
       OR content LIKE '%\\\\right%'
       OR content LIKE '%\\\\boxed%'
       OR content LIKE '%\\\\begin%'
       OR choices::text LIKE '%\\\\\\\\overline%'
       OR choices::text LIKE '%\\\\\\\\frac%'
       OR choices::text LIKE '%\\\\\\\\sqrt%'
       OR choices::text LIKE '%\\\\\\\\angle%'
       OR choices::text LIKE '%\\\\\\\\triangle%'
       OR choices::text LIKE '%\\\\\\\\times%'
       OR choices::text LIKE '%\\\\\\\\text%'
       OR answer LIKE '%\\\\overline%'
       OR answer LIKE '%\\\\frac%'
       OR explanation LIKE '%\\\\overline%'
       OR explanation LIKE '%\\\\frac%'
  `);

  // 하지만 위 쿼리는 정상 단일 \도 매칭할 수 있음 (PostgreSQL LIKE의 \\ 해석)
  // 따라서 실제 데이터를 가져와서 JS에서 정밀 검증

  const allQuestions = await prisma.question.findMany({
    select: {
      id: true,
      bookCode: true,
      questionNum: true,
      source: true,
      content: true,
      choices: true,
      answer: true,
      explanation: true,
    },
    orderBy: [{ bookCode: 'asc' }, { questionNum: 'asc' }],
  });

  console.log(`총 ${allQuestions.length}개 문제 스캔 중...\n`);

  // 이중 이스케이프 패턴: 리터럴 \\ 뒤에 영문자 (LaTeX 명령어)
  // JS 문자열에서 리터럴 \\는 length 2
  const doubleEscapePattern = /\\\\[a-zA-Z]/;

  interface BrokenQuestion {
    id: string;
    bookCode: string;
    questionNum: number;
    source: string | null;
    fields: string[];
    samples: string[];
  }

  const broken: BrokenQuestion[] = [];

  for (const q of allQuestions) {
    const fields: string[] = [];
    const samples: string[] = [];

    // content 체크
    if (doubleEscapePattern.test(q.content)) {
      fields.push('content');
      const match = q.content.match(/\\\\[a-zA-Z]+/);
      if (match) samples.push(`content: "${match[0]}"`);
    }

    // answer 체크
    if (doubleEscapePattern.test(q.answer)) {
      fields.push('answer');
      const match = q.answer.match(/\\\\[a-zA-Z]+/);
      if (match) samples.push(`answer: "${match[0]}"`);
    }

    // explanation 체크
    if (q.explanation && doubleEscapePattern.test(q.explanation)) {
      fields.push('explanation');
      const match = q.explanation.match(/\\\\[a-zA-Z]+/);
      if (match) samples.push(`explanation: "${match[0]}"`);
    }

    // choices 체크
    if (Array.isArray(q.choices)) {
      for (let i = 0; i < q.choices.length; i++) {
        const choice = q.choices[i] as string;
        if (typeof choice === 'string' && doubleEscapePattern.test(choice)) {
          fields.push(`choices[${i}]`);
          const match = choice.match(/\\\\[a-zA-Z]+/);
          if (match) samples.push(`choices[${i}]: "${match[0]}"`);
          break; // 하나만 리포트
        }
      }
    }

    if (fields.length > 0) {
      broken.push({
        id: q.id,
        bookCode: q.bookCode,
        questionNum: q.questionNum,
        source: q.source,
        fields,
        samples,
      });
    }
  }

  // ── 결과 출력 ──────────────────────────────────────

  if (broken.length === 0) {
    console.log('✅ 이중 이스케이프된 문제가 없습니다!');
    await prisma.$disconnect();
    return;
  }

  console.log(`⚠️  ${broken.length}개 문제에서 이중 이스케이프 발견\n`);

  // 교재별 그룹핑
  const bookGroups: Record<string, BrokenQuestion[]> = {};
  for (const q of broken) {
    if (!bookGroups[q.bookCode]) bookGroups[q.bookCode] = [];
    bookGroups[q.bookCode].push(q);
  }

  console.log('── 교재별 ──');
  for (const [book, qs] of Object.entries(bookGroups).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${book}: ${qs.length}개`);
  }

  // 상세 목록
  console.log('\n── 상세 목록 ──');
  for (const q of broken) {
    console.log(`[${q.bookCode}] #${q.questionNum} (${q.id})`);
    console.log(`  source: ${q.source || '-'}`);
    console.log(`  영향 필드: ${q.fields.join(', ')}`);
    for (const s of q.samples) {
      console.log(`  예시: ${s}`);
    }
  }

  // ── 수정 ──────────────────────────────────────────

  if (FIX) {
    console.log(`\n── 수정 ${APPLY ? '적용 중...' : '미리보기'} ──\n`);
    let fixedCount = 0;

    for (const bq of broken) {
      const q = allQuestions.find(oq => oq.id === bq.id)!;

      const newContent = fixDoubleEscape(q.content);
      const newAnswer = fixDoubleEscape(q.answer);
      const newExplanation = q.explanation ? fixDoubleEscape(q.explanation) : q.explanation;

      let newChoices = q.choices;
      let choicesChanged = false;
      if (Array.isArray(q.choices)) {
        const fixed = (q.choices as string[]).map(c => fixDoubleEscape(c));
        choicesChanged = fixed.some((c, i) => c !== (q.choices as string[])[i]);
        if (choicesChanged) newChoices = fixed;
      }

      const hasChange =
        newContent !== q.content ||
        newAnswer !== q.answer ||
        newExplanation !== q.explanation ||
        choicesChanged;

      if (!hasChange) continue;

      fixedCount++;

      if (!APPLY) {
        console.log(`[${bq.bookCode}] #${bq.questionNum}`);
        if (newContent !== q.content) {
          // 변경 부분 미리보기
          const beforeSnippet = q.content.match(/\\\\[a-zA-Z]+[^$]*/)?.[0]?.substring(0, 40) || '';
          const afterSnippet = newContent.match(/\\[a-zA-Z]+[^$]*/)?.[0]?.substring(0, 40) || '';
          console.log(`  content: "${beforeSnippet}" → "${afterSnippet}"`);
        }
        if (choicesChanged) {
          const before = (q.choices as string[])[0]?.substring(0, 50) || '';
          const after = (newChoices as string[])[0]?.substring(0, 50) || '';
          console.log(`  choices[0]: "${before}" → "${after}"`);
        }
        if (newAnswer !== q.answer) {
          console.log(`  answer: "${q.answer.substring(0, 40)}" → "${newAnswer.substring(0, 40)}"`);
        }
      } else {
        await prisma.question.update({
          where: { id: q.id },
          data: {
            content: newContent,
            answer: newAnswer,
            explanation: newExplanation,
            ...(choicesChanged && { choices: newChoices }),
          },
        });
        console.log(`  ✅ [${bq.bookCode}] #${bq.questionNum} 수정 완료`);
      }
    }

    console.log(`\n총 ${fixedCount}개 문제 ${APPLY ? '수정 완료 ✅' : '수정 예정 (--apply 추가)'}`);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
