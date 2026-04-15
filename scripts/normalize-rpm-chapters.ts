/**
 * RPM 문제(chapter="미분류")를 section 키워드로 분류
 * 실행: npx tsx scripts/normalize-rpm-chapters.ts --apply
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// 키워드 → chapter (중1 기준, curriculum.ts 표준 단원명)
// 순서 중요: 구체적인 것부터 매칭 (일차방정식 활용 문제가 많음)
const RULES: Array<{ chapter: string; keywords: string[] }> = [
  { chapter: '소인수분해', keywords: ['소인수', '소수', '합성수', '거듭제곱', '약수', '배수', '최대공약', '최소공배', '서로소'] },
  { chapter: '정수와 유리수의 덧셈과 뺄셈', keywords: ['덧셈과 뺄셈'] },
  { chapter: '정수와 유리수의 곱셈과 나눗셈', keywords: ['곱셈과 나눗셈', '역수', '혼합 계산', '분배법칙', '(-1)^n', '(-1)', '^n'] },
  { chapter: '정수와 유리수', keywords: ['정수', '유리수', '절댓값', '부호', '수직선', '대소', '덧셈', '뺄셈', '곱셈', '나눗셈'] },
  { chapter: '문자의 사용과 식', keywords: ['문자', '대입', '일차식', '다항식', '항등식', '식의 값', '차수', '동류항', '어떤 식', '바르게 계산', '부등호'] },
  { chapter: '일차방정식', keywords: [
    '방정식', '등식', '이항', '해에', '해를',
    '거리', '속력', '시간', '농도', '활용',
    '어떤 수', '연속하는', '자연수', '예금', '개수', '자릿수', '과부족',
    '증가', '감소', '전체의 양', '도형에 대한', '의자', '원가', '정가',
    '나이', '일에 대한', '규칙', '큰 수', '작은 수'
  ] },
  { chapter: '좌표와 그래프', keywords: ['좌표', '그래프', '사분면', '순서쌍'] },
  { chapter: '정비례와 반비례', keywords: ['정비례', '반비례', '비례'] },
];

function inferChapter(section: string | null): string | null {
  if (!section) return null;
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (section.includes(kw)) return rule.chapter;
    }
  }
  return null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rows = await db.question.findMany({
    where: { source: { contains: 'RPM' }, chapter: '미분류' },
    select: { id: true, section: true, chapter: true },
  });

  const updates: Record<string, number> = {};
  let unmatched = 0;
  const unmatchedSamples: string[] = [];

  for (const row of rows) {
    const next = inferChapter(row.section);
    if (!next) {
      unmatched++;
      if (unmatchedSamples.length < 10 && row.section) unmatchedSamples.push(row.section);
      continue;
    }
    updates[next] = (updates[next] ?? 0) + 1;
    if (apply) {
      await db.question.update({ where: { id: row.id }, data: { chapter: next } });
    }
  }

  console.log('=== 분류 결과 ===');
  for (const [ch, n] of Object.entries(updates).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${ch}: ${n}`);
  }
  console.log(`미매칭: ${unmatched}`);
  if (unmatchedSamples.length) {
    console.log('미매칭 샘플 section:');
    unmatchedSamples.forEach(s => console.log(`  - ${s}`));
  }
  console.log(apply ? '\n적용 완료' : '\n(dry-run: --apply 로 실제 반영)');
}

main().catch(console.error).finally(() => db.$disconnect());
