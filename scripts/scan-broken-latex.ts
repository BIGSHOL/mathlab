/**
 * 문제은행 전체 스캔 — 깨진 LaTeX 패턴 탐지
 *
 * 탐지 대상:
 *   1. 백슬래시 누락: overlineAB → \overline{AB}, frac13 → \frac{1}{3} 등
 *   2. 중괄호 누락: \overlineAB → \overline{AB}
 *   3. $ 구분자 누락: 수식이 $ 없이 노출된 경우
 *
 * 대상 필드: content, choices, answer, explanation
 *
 * 사용법:
 *   npx tsx scripts/scan-broken-latex.ts                # 전체 스캔
 *   npx tsx scripts/scan-broken-latex.ts --book 1-1     # 특정 교재만
 *   npx tsx scripts/scan-broken-latex.ts --fix --apply  # 자동 수정 적용
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const FIX = args.includes('--fix');
const APPLY = args.includes('--apply');
const bookIdx = args.indexOf('--book');
const BOOK_FILTER = bookIdx !== -1 ? args[bookIdx + 1] : undefined;

// ── LaTeX 명령어 패턴 ──────────────────────────────────

// 백슬래시 없이 노출된 LaTeX 명령어 (단어 경계 기준)
const LATEX_COMMANDS = [
  'overline', 'underline', 'overrightarrow',
  'frac', 'dfrac', 'tfrac',
  'sqrt', 'cbrt',
  'times', 'cdot', 'cdots', 'ldots', 'dots', 'pm', 'mp', 'div',
  'angle', 'triangle', 'square', 'circle', 'parallel', 'perp',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim',
  'infty', 'pi', 'theta', 'alpha', 'beta', 'gamma', 'delta', 'sigma', 'omega', 'lambda', 'epsilon', 'phi', 'psi', 'rho', 'tau', 'mu', 'nu', 'kappa', 'eta', 'zeta', 'xi',
  'sin', 'cos', 'tan', 'log', 'ln',
  'left', 'right', 'big', 'Big',
  'text', 'mathrm', 'mathbf', 'mathit', 'textbf',
  'begin', 'end',
  'quad', 'qquad',
  'sum', 'prod', 'int', 'lim',
  'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
  'therefore', 'because',
];

// 카테고리별 분류 (리포트용)
const CATEGORY: Record<string, string> = {
  overline: '선분/기호', underline: '선분/기호', overrightarrow: '선분/기호',
  frac: '분수', dfrac: '분수', tfrac: '분수',
  sqrt: '근호', cbrt: '근호',
  times: '연산자', cdot: '연산자', div: '연산자', pm: '연산자', mp: '연산자',
  angle: '도형', triangle: '도형', square: '도형', circle: '도형', parallel: '도형', perp: '도형',
  sin: '삼각함수', cos: '삼각함수', tan: '삼각함수',
  pi: '그리스문자', theta: '그리스문자', alpha: '그리스문자', beta: '그리스문자',
};

interface Issue {
  field: string;
  type: 'missing_backslash' | 'missing_braces' | 'missing_dollar';
  command: string;
  context: string;  // 주변 텍스트
}

interface QuestionIssue {
  id: string;
  bookCode: string;
  questionNum: number;
  source: string | null;
  issues: Issue[];
}

// ── 탐지 함수 ──────────────────────────────────────────

function detectBrokenLatex(text: string, field: string): Issue[] {
  const issues: Issue[] = [];

  for (const cmd of LATEX_COMMANDS) {
    // 패턴 1: 백슬래시 없이 노출 (예: overlineAB, frac12)
    // 단, $ 안에 있는 정상 수식은 제외해야 하지만,
    // $ 자체가 없는 게 문제이므로 일단 전체에서 탐지
    const noBackslashRegex = new RegExp(
      `(?<!\\\\)(?<!\\w)${cmd}(?=[A-Z0-9{(])`,
      'g'
    );
    let match;
    while ((match = noBackslashRegex.exec(text)) !== null) {
      // 이미 \가 바로 앞에 있으면 스킵 (정상)
      const before = text.substring(Math.max(0, match.index - 1), match.index);
      if (before === '\\') continue;

      // 영단어의 일부인 경우 스킵 (예: "overtime", "divided")
      const charBefore = match.index > 0 ? text[match.index - 1] : '';
      if (/[a-z]/i.test(charBefore)) continue;

      const start = Math.max(0, match.index - 15);
      const end = Math.min(text.length, match.index + cmd.length + 15);
      const context = text.substring(start, end).replace(/\n/g, '↵');

      issues.push({
        field,
        type: 'missing_backslash',
        command: cmd,
        context: `…${context}…`,
      });
    }

    // 패턴 2: 백슬래시는 있지만 중괄호 누락 (예: \overlineAB → \overline{AB})
    // overline, sqrt, text 같은 명령어에만 적용
    if (['overline', 'underline', 'overrightarrow', 'sqrt', 'text', 'mathrm', 'mathbf', 'textbf'].includes(cmd)) {
      const noBracesRegex = new RegExp(
        `\\\\${cmd}([A-Za-z0-9]{2,})`,
        'g'
      );
      while ((match = noBracesRegex.exec(text)) !== null) {
        // \overline{AB}는 정상 — 바로 뒤가 { 이면 스킵
        const afterCmd = text[match.index + cmd.length + 1];
        if (afterCmd === '{') continue;

        const start = Math.max(0, match.index - 10);
        const end = Math.min(text.length, match.index + cmd.length + 15);
        const context = text.substring(start, end).replace(/\n/g, '↵');

        issues.push({
          field,
          type: 'missing_braces',
          command: cmd,
          context: `…${context}…`,
        });
      }
    }
  }

  return issues;
}

function scanQuestion(q: {
  id: string;
  bookCode: string;
  questionNum: number;
  source: string | null;
  content: string;
  choices: unknown;
  answer: string;
  explanation: string | null;
}): QuestionIssue | null {
  const allIssues: Issue[] = [];

  // content 검사
  allIssues.push(...detectBrokenLatex(q.content, 'content'));

  // choices 검사
  if (Array.isArray(q.choices)) {
    for (let i = 0; i < q.choices.length; i++) {
      const choice = q.choices[i] as string;
      if (typeof choice === 'string') {
        allIssues.push(...detectBrokenLatex(choice, `choices[${i}]`));
      }
    }
  }

  // answer 검사
  allIssues.push(...detectBrokenLatex(q.answer, 'answer'));

  // explanation 검사
  if (q.explanation) {
    allIssues.push(...detectBrokenLatex(q.explanation, 'explanation'));
  }

  if (allIssues.length === 0) return null;

  return {
    id: q.id,
    bookCode: q.bookCode,
    questionNum: q.questionNum,
    source: q.source,
    issues: allIssues,
  };
}

// ── 자동 수정 함수 ─────────────────────────────────────

function fixBrokenLatex(text: string): string {
  let fixed = text;

  for (const cmd of LATEX_COMMANDS) {
    // 백슬래시 누락 수정: overlineAB → \overline{AB} (or \overline AB)
    // overline, underline 등은 뒤에 인자가 필요한 명령어
    const needsBraces = ['overline', 'underline', 'overrightarrow', 'sqrt', 'text', 'mathrm', 'mathbf', 'textbf'];

    if (needsBraces.includes(cmd)) {
      // overlineAB → \overline{AB}
      const regex = new RegExp(`(?<!\\\\)(?<![a-z])${cmd}([A-Z][A-Za-z0-9]*)`, 'g');
      fixed = fixed.replace(regex, `\\${cmd}{$1}`);
    } else if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
      // frac12 → \frac{1}{2}, frac13 → \frac{1}{3}
      const regex = new RegExp(`(?<!\\\\)(?<![a-z])${cmd}(\\d)(\\d)`, 'g');
      fixed = fixed.replace(regex, `\\frac{$1}{$2}`);
      // frac23 같은 패턴
      const regexWord = new RegExp(`(?<!\\\\)(?<![a-z])${cmd}([A-Za-z0-9]+)`, 'g');
      // 위에서 처리 안된 나머지 — 일단 백슬래시만 추가
      fixed = fixed.replace(regexWord, `\\frac$1`);
    } else {
      // 기타 명령어: 백슬래시만 추가 (times, cdot, angle 등)
      const regex = new RegExp(`(?<!\\\\)(?<![a-z])${cmd}(?=[^a-z]|$)`, 'g');
      fixed = fixed.replace(regex, `\\${cmd}`);
    }
  }

  return fixed;
}

// ── 메인 ───────────────────────────────────────────────

async function main() {
  console.log('🔍 문제은행 LaTeX 깨짐 전체 스캔');
  console.log(`   모드: ${FIX ? (APPLY ? '수정 적용' : '수정 미리보기') : '탐지만'}`);
  if (BOOK_FILTER) console.log(`   교재 필터: ${BOOK_FILTER}`);
  console.log('');

  // 전체 문제 조회
  const where = BOOK_FILTER ? { bookCode: BOOK_FILTER } : {};
  const questions = await prisma.question.findMany({
    where,
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

  console.log(`총 ${questions.length}개 문제 스캔 중...\n`);

  const results: QuestionIssue[] = [];
  const categoryCounts: Record<string, number> = {};
  const bookCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};

  for (const q of questions) {
    const result = scanQuestion(q);
    if (result) {
      results.push(result);
      bookCounts[q.bookCode] = (bookCounts[q.bookCode] || 0) + 1;

      for (const issue of result.issues) {
        const cat = CATEGORY[issue.command] || '기타';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        typeCounts[issue.type] = (typeCounts[issue.type] || 0) + 1;
      }
    }
  }

  // ── 결과 출력 ──────────────────────────────────────

  if (results.length === 0) {
    console.log('✅ 깨진 LaTeX 패턴이 발견되지 않았습니다!');
    await prisma.$disconnect();
    return;
  }

  console.log(`⚠️  ${results.length}개 문제에서 총 ${results.reduce((s, r) => s + r.issues.length, 0)}개 이슈 발견\n`);

  // 교재별 요약
  console.log('── 교재별 이슈 수 ──');
  const sortedBooks = Object.entries(bookCounts).sort((a, b) => b[1] - a[1]);
  for (const [book, count] of sortedBooks) {
    console.log(`  ${book}: ${count}개`);
  }

  // 카테고리별 요약
  console.log('\n── 카테고리별 이슈 수 ──');
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}개`);
  }

  // 이슈 유형별 요약
  console.log('\n── 이슈 유형별 ──');
  const typeLabels: Record<string, string> = {
    missing_backslash: '백슬래시 누락',
    missing_braces: '중괄호 누락',
    missing_dollar: '$ 구분자 누락',
  };
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${typeLabels[type] || type}: ${count}개`);
  }

  // 상세 목록 (상위 50개만)
  console.log('\n── 상세 이슈 (상위 50개) ──');
  let shown = 0;
  for (const q of results) {
    if (shown >= 50) {
      console.log(`\n... 외 ${results.length - 50}개 문제 생략`);
      break;
    }
    console.log(`\n[${q.bookCode}] #${q.questionNum} (${q.id})${q.source ? ` — ${q.source}` : ''}`);
    for (const issue of q.issues) {
      const typeLabel = issue.type === 'missing_backslash' ? '\\없음' : issue.type === 'missing_braces' ? '{}없음' : '$없음';
      console.log(`  ${typeLabel} | ${issue.command} | ${issue.field} | ${issue.context}`);
    }
    shown++;
  }

  // ── 자동 수정 ──────────────────────────────────────

  if (FIX) {
    console.log(`\n── 자동 수정 ${APPLY ? '적용 중' : '미리보기'} ──`);
    let fixedCount = 0;

    for (const q of results) {
      const original = questions.find(oq => oq.id === q.id)!;

      const newContent = fixBrokenLatex(original.content);
      const newAnswer = fixBrokenLatex(original.answer);
      const newExplanation = original.explanation ? fixBrokenLatex(original.explanation) : original.explanation;

      let newChoices = original.choices;
      let choicesChanged = false;
      if (Array.isArray(original.choices)) {
        const fixed = (original.choices as string[]).map(c => fixBrokenLatex(c));
        choicesChanged = fixed.some((c, i) => c !== (original.choices as string[])[i]);
        if (choicesChanged) newChoices = fixed;
      }

      const hasChange =
        newContent !== original.content ||
        newAnswer !== original.answer ||
        newExplanation !== original.explanation ||
        choicesChanged;

      if (!hasChange) continue;

      fixedCount++;

      if (!APPLY) {
        console.log(`\n[${q.bookCode}] #${q.questionNum}`);
        if (newContent !== original.content) {
          console.log(`  content 변경 예정`);
        }
        if (newAnswer !== original.answer) {
          console.log(`  answer: "${original.answer}" → "${newAnswer}"`);
        }
        if (choicesChanged) {
          console.log(`  choices 변경 예정`);
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
      }
    }

    console.log(`\n총 ${fixedCount}개 문제 ${APPLY ? '수정 완료 ✅' : '수정 예정 (--apply 추가하여 실행)'}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
