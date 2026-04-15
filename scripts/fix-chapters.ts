import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

/**
 * 표준 curriculum.ts (중1-1):
 * - 소인수분해: [소인수분해, 최대공약수와 최소공배수]
 * - 정수와 유리수: [정수와 유리수, 정수와 유리수의 덧셈과 뺄셈, 정수와 유리수의 곱셈과 나눗셈]
 * - 문자의 사용과 식: [문자의 사용과 식의 계산, 일차식의 덧셈과 뺄셈]
 * - 일차방정식: [일차방정식의 풀이, 일차방정식의 활용]
 */

function normalize(chapter: string, section: string, content: string): { chapter: string; section: string } {
  let ch = (chapter || '').trim();
  const sec = (section || '').trim();
  const allText = (ch + ' ' + sec + ' ' + content).toLowerCase();

  // chapter 정규화
  if (ch === '정수와 유리수의 덧셈과 뺄셈' || ch === '정수와 유리수의 곱셈과 나눗셈') ch = '정수와 유리수';

  // 미분류 chapter → 내용/section으로 추정
  if (ch === '미분류' || !ch) {
    if (/소인수|최대공약수|최소공배수|서로소|약수|합성수|소수/.test(sec + content)) ch = '소인수분해';
    else if (/정수|유리수|절댓값|수직선|덧셈|뺄셈|곱셈|나눗셈|역수/.test(sec + content)) ch = '정수와 유리수';
    else if (/문자|동류항|다항식|일차식|항등식|식의 값/.test(sec + content)) ch = '문자의 사용과 식';
    else if (/방정식|해|이항|등식의 성질|농도|속력|거리|시간|원가|정가/.test(sec + content)) ch = '일차방정식';
  }

  // section 정규화 (chapter 기준 subUnit 매핑)
  let ns = sec;
  switch (ch) {
    case '소인수분해':
      if (/최대공약수|최소공배수|공약수|공배수|서로소|톱니바퀴|간격.*놓기|채우기/.test(sec + content))
        ns = '최대공약수와 최소공배수';
      else
        ns = '소인수분해';
      break;
    case '정수와 유리수':
      if (/곱셈|나눗셈|분배법칙|역수|거듭제곱|혼합 계산|곱셈의 계산|유리수의 곱셈|유리수의 나눗셈/.test(sec + content))
        ns = '정수와 유리수의 곱셈과 나눗셈';
      else if (/덧셈|뺄셈|덧셈과 뺄셈|계산 법칙/.test(sec + content))
        ns = '정수와 유리수의 덧셈과 뺄셈';
      else
        ns = '정수와 유리수';
      break;
    case '문자의 사용과 식':
      if (/일차식의 덧셈|일차식의 뺄셈|동류항|일차식과 수의 곱셈|분배법칙|괄호가 여러 개|분수 꼴인 일차식|도형에서의 일차식/.test(sec + content))
        ns = '일차식의 덧셈과 뺄셈';
      else
        ns = '문자의 사용과 식의 계산';
      break;
    case '일차방정식':
      if (/활용|속력|농도|거리|시간|비례식|과부족|나이|예금|자릿수|연속하는|개수의 합|규칙|도형|증가|감소|전체의 양|원가|정가|일에 대한|기차|다리|터널|긴 의자/.test(sec + content))
        ns = '일차방정식의 활용';
      else
        ns = '일차방정식의 풀이';
      break;
  }
  return { chapter: ch, section: ns };
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, chapter: true, section: true, content: true },
    orderBy: { questionNum: 'asc' },
  });

  const changes: { num: number; from: string; to: string }[] = [];
  let updated = 0;
  for (const q of qs) {
    const { chapter: newCh, section: newSec } = normalize(q.chapter || '', q.section || '', q.content || '');
    if (newCh === q.chapter && newSec === q.section) continue;
    changes.push({ num: q.questionNum!, from: `[${q.chapter}]/[${q.section}]`, to: `[${newCh}]/[${newSec}]` });
    if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { chapter: newCh, section: newSec } });
    updated++;
  }
  console.log(`변경: ${updated}건`);

  // 변경 요약 (from/to 조합 빈도)
  const tally: Record<string, number> = {};
  for (const c of changes) {
    const k = `${c.from} → ${c.to}`;
    tally[k] = (tally[k] || 0) + 1;
  }
  console.log('\n주요 변경 패턴:');
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
    console.log(`  ${v}건: ${k}`);
  }
  console.log(APPLY ? '\n✅ 적용' : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
