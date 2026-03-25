import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const concepts = await db.concept.findMany({
  where: { grade: { startsWith: 'elementary' } },
  select: { id: true, conceptCode: true, fullContent: true },
});

let updated = 0;

for (const c of concepts) {
  let text = c.fullContent;
  const original = text;

  // 1) 단독 숫자: $123$ → 123 (수식 아닌 단독 숫자)
  text = text.replace(/\$(\d+)\$/g, '$1');

  // 2) 단독 연산 기호: $+$ $## $ $=$ $\times$ $\div$ → 기호 직접
  text = text.replace(/\$\+\$/g, '+');
  text = text.replace(/\$-\$/g, '-');
  text = text.replace(/\$=\$/g, '=');
  text = text.replace(/\$\\times\$/g, '×');
  text = text.replace(/\$\\div\$/g, '÷');

  // 3) 한글이 포함된 수식: $나누는 수 \times 몫$ → 나누는 수 × 몫
  //    (한글이 KaTeX 안에 있으면 폰트 깨짐)
  text = text.replace(/\$([^$]*[가-힣][^$]*)\$/g, (match, inner) => {
    return inner
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\dots/g, '…')
      .replace(/\\cdot/g, '·');
  });

  // 4) 수식 표현은 유지하되, 간단한 사칙연산도 일반 텍스트로
  //    $25 \div 4 = 6 \dots 1$ → 25 ÷ 4 = 6 … 1
  //    $12 \div 3$ → 12 ÷ 3
  //    $3 \times 4 = 12$ → 3 × 4 = 12
  //    $a + b = c$ 형태 (숫자+기본연산만) → 일반 텍스트
  text = text.replace(/\$([^$]+)\$/g, (match, inner) => {
    // 분수(\frac), 제곱(^), 아래첨자(_), 루트(\sqrt) 등 복잡한 수식은 유지
    if (/\\(?!times|div|dots|cdot|,)/.test(inner) || /[\^_{}]/.test(inner)) {
      return match;
    }
    // 간단한 숫자+연산만 있으면 일반 텍스트로
    return inner
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\dots/g, '…')
      .replace(/\\cdot/g, '·')
      .replace(/\\,/g, '');
  });

  if (text !== original) {
    await db.concept.update({ where: { id: c.id }, data: { fullContent: text } });
    updated++;
    console.log(`${c.conceptCode}: 수정됨`);
  }
}

console.log(`\n완료: ${updated}/${concepts.length}개 수정`);
await db.$disconnect();
