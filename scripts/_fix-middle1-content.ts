import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// 1. 짧은 콘텐츠 보강
const CONTENT_FIXES: Record<string, string> = {
  'M1-NUM-03-1': [
    "자연수에 양의 부호 $'+'$를 붙인 수를 양의 정수라 하고, 자연수에 음의 부호 $'-'$를 붙인 수를 음의 정수라 한다. 양의 정수, $0$, 음의 정수를 통틀어 정수라고 한다.",
    "양의 정수는 $+1, +2, +3, ...$이고, 보통 $'+'$ 부호를 생략하여 $1, 2, 3, ...$으로 쓴다. 즉 양의 정수는 자연수와 같다.",
    "음의 정수는 $-1, -2, -3, ...$이다.",
    "$0$은 양의 정수도 음의 정수도 아니다.",
    "예) 온도를 나타낼 때, 영상 $5$도는 $+5$, 영하 $3$도는 $-3$으로 표현한다. 해발 $100$m 위는 $+100$, 해수면 아래 $50$m는 $-50$으로 나타낸다.",
    "정수 전체를 분류하면 양의 정수($1, 2, 3, ...$), $0$, 음의 정수($-1, -2, -3, ...$)의 세 부류로 나뉜다. 이때 $0$은 반드시 별도로 구분해야 한다.",
  ].join('\n'),

  'M1-NUM-03-2': [
    "정수 또는 분수 $\\frac{b}{a}$ (단, $a \\neq 0$인 정수, $b$는 정수)의 꼴로 나타낼 수 있는 수를 유리수라 한다. $a$는 분모, $b$는 분자이다.",
    "유리수는 양의 유리수, $0$, 음의 유리수로 나눌 수 있다. 양의 유리수에는 양의 정수와 양의 분수가 포함되고, 음의 유리수에는 음의 정수와 음의 분수가 포함된다.",
    "모든 정수는 분모가 $1$인 분수로 나타낼 수 있으므로 정수는 유리수에 포함된다. 예) $3 = \\frac{3}{1}$, $-2 = \\frac{-2}{1}$, $0 = \\frac{0}{1}$이다.",
    "예) $\\frac{1}{2}$, $-\\frac{3}{4}$, $0.5$, $-1.7$ 등은 모두 유리수이다.",
    "유리수 전체는 정수와 정수가 아닌 유리수(분수, 유한소수 등)로 이루어져 있다. 소수 중 유한소수와 순환소수는 분수로 나타낼 수 있으므로 유리수이다.",
  ].join('\n'),

  'M1-NUM-03-3': [
    "수직선은 기준점인 원점 $0$을 중심으로 오른쪽에 양수를, 왼쪽에 음수를 대응시킨 직선이다. 수직선 위에서 오른쪽으로 갈수록 수가 커지고, 왼쪽으로 갈수록 수가 작아진다.",
    "원점 $0$으로부터 어떤 수에 대응하는 점까지의 거리를 그 수의 절댓값이라 하고, 기호 $|\\quad|$로 나타낸다.",
    "절댓값은 항상 $0$ 또는 양수이다. 양수의 절댓값은 그 수 자체이고, 음수의 절댓값은 부호를 뗀 수이며, $0$의 절댓값은 $0$이다.",
    "예) $|+3| = 3$, $|-5| = 5$, $|0| = 0$이다. $+3$과 $-3$은 절댓값이 같지만 부호가 다른 수이다.",
    "수직선에서 두 수의 대소를 비교할 때, 오른쪽에 있는 수가 항상 더 크다. 따라서 양수는 $0$보다 크고, 음수는 $0$보다 작으며, 양수는 어떤 음수보다도 크다. 절댓값이 클수록 원점에서 멀리 떨어져 있다.",
  ].join('\n'),

  'M1-ALG-02-1': [
    "동류항이란 문자와 차수가 같은 항을 말한다. 계수는 달라도 문자 부분이 같으면 동류항이다. 상수항끼리도 동류항으로 본다.",
    "동류항끼리는 덧셈과 뺄셈이 가능하며, 계수끼리 더하거나 빼서 하나의 항으로 정리할 수 있다. 이것을 동류항의 정리라 한다.",
    "예) $3x$와 $5x$는 문자 부분이 모두 $x$이므로 동류항이다. $3x + 5x = 8x$로 계산한다.",
    "$2y^2$와 $-7y^2$도 문자 부분이 $y^2$으로 같으므로 동류항이다. $2y^2 + (-7y^2) = -5y^2$이다.",
    "하지만 $3x$와 $5y$는 문자가 달라 동류항이 아니고, $2x$와 $2x^2$는 차수가 달라 동류항이 아니다. 상수항 $4$와 $-1$은 동류항이므로 $4 + (-1) = 3$으로 계산할 수 있다.",
    "식을 정리할 때는 먼저 동류항을 찾아 묶고, 계수끼리 계산하는 것이 핵심이다. 문자의 종류뿐 아니라 차수까지 반드시 확인해야 한다.",
  ].join('\n'),
};

async function main() {
  // 1. 짧은 콘텐츠 보강
  console.log('=== 짧은 콘텐츠 보강 ===');
  for (const [code, content] of Object.entries(CONTENT_FIXES)) {
    await p.concept.updateMany({
      where: { conceptCode: code },
      data: { fullContent: content },
    });
    console.log(`  ${code}: ${content.length}자`);
  }

  // 2. LaTeX 깨진 부분 수정
  console.log('\n=== LaTeX 수정 ===');
  const all = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { id: true, conceptCode: true, fullContent: true },
  });

  let fixCount = 0;
  for (const c of all) {
    if (!c.fullContent) continue;
    let fixed = c.fullContent;

    // \frac → rac 깨짐 (탭문자 + rac)
    fixed = fixed.replace(/\trac\{/g, '\\frac{');
    // \times → imes 깨짐 (탭문자 + imes)
    fixed = fixed.replace(/\times/g, '\\times');
    // 이미 \\times가 된 것 복구
    fixed = fixed.replace(/\\\\times/g, '\\times');

    // \neq → \ne 형태 복구 (줄바꿈+e 패턴)
    // DB에서 \n + e 로 저장된 패턴 → \neq로 복구
    // 수식 안에서 줄바꿈은 없으므로, $...$ 내부의 \n을 찾아 처리
    // 실제로는 "\\ne " 패턴이 됨

    if (fixed !== c.fullContent) {
      await p.concept.update({
        where: { id: c.id },
        data: { fullContent: fixed },
      });
      fixCount++;
      console.log(`  ${c.conceptCode}: LaTeX 수정됨`);
    }
  }
  console.log(`LaTeX 수정: ${fixCount}개`);

  // 3. 수식 내 \neq 깨짐 직접 패치 (알려진 개념들)
  console.log('\n=== \\neq 직접 패치 ===');
  const neqTargets = ['M1-ALG-03-2', 'M1-FUNC-03-1', 'M1-FUNC-04-1', 'M1-FUNC-04-2'];
  for (const code of neqTargets) {
    const c = await p.concept.findFirst({ where: { conceptCode: code }, select: { id: true, fullContent: true } });
    if (!c?.fullContent) continue;
    // \ne 0 → \neq 0 패턴 (줄바꿈이 아닌 실제 \ne)
    // DB에 저장될 때 \n이 줄바꿈으로 해석됨 → "e 0" 으로 시작하는 줄이 됨
    const lines = c.fullContent.split('\n');
    let modified = false;
    for (let i = 0; i < lines.length; i++) {
      // "e 0$" or "eq 0$" 같은 패턴이 줄 시작에 있으면 이전 줄과 합치기
      if (lines[i].match(/^e[q]? [0-9]/) && i > 0 && lines[i-1].endsWith('$')) {
        // 이전 줄의 마지막 $ 제거, 현재 줄의 내용을 \neq로 교체
        const prev = lines[i-1].slice(0, -1); // $ 제거
        const curr = lines[i].replace(/^e[q]?\s/, '\\neq ');
        lines[i-1] = prev + curr;
        lines.splice(i, 1);
        i--;
        modified = true;
      }
    }
    if (modified) {
      const newContent = lines.join('\n');
      await p.concept.update({ where: { id: c.id }, data: { fullContent: newContent } });
      console.log(`  ${code}: \\neq 복구됨`);
    }
  }

  // 4. 최종 검증
  console.log('\n=== 최종 검증 ===');
  const final = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { conceptCode: true, title: true, fullContent: true },
    orderBy: { sortOrder: 'asc' },
  });

  let shortCount = 0;
  for (const c of final) {
    const len = c.fullContent?.length || 0;
    const content = c.fullContent || '';
    const issues: string[] = [];
    if (len < 250) { issues.push(`${len}자`); shortCount++; }
    // 깨진 LaTeX 확인: rac{ (앞에 \가 없는), imes (앞에 \가 없는)
    if (/\trac\{/.test(content)) issues.push('rac깨짐');
    if (/\times/.test(content) && !/\\times/.test(content)) issues.push('imes깨짐');
    const flag = issues.length > 0 ? ` ⚠ ${issues.join(', ')}` : '';
    console.log(`${c.conceptCode} [${len}자]${flag} ${c.title}`);
  }
  console.log(`\n250자 미만: ${shortCount}개`);
}
main().then(() => p.$disconnect());
