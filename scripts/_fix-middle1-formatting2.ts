import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const concepts = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { id: true, conceptCode: true, fullContent: true },
  });

  let fixCount = 0;

  for (const c of concepts) {
    if (!c.fullContent) continue;
    let fixed = c.fullContent;
    const issues: string[] = [];

    // 1. 이중 캐럿 수정: ^^\circ → ^\circ
    if (fixed.includes('^^')) {
      fixed = fixed.replace(/\^\^\\circ/g, '^\\circ');
      issues.push('이중캐럿 수정');
    }

    // 2. 탭 문자 잔존 확인 및 수정 (LaTeX 깨짐 본체)
    // \t in JS = 탭문자. DB에 탭이 남아있으면 깨진 것
    if (fixed.indexOf('\t') !== -1) {
      // 탭+riangle → \triangle
      fixed = fixed.split('\triangle').join('\\triangle');
      // 탭+imes → \times
      fixed = fixed.split('\times').join('\\times');
      // 탭+ext → \text
      fixed = fixed.split('\text').join('\\text');
      // 탭+an → \tan
      fixed = fixed.split('\tan').join('\\tan');
      // 나머지 탭 문자 (unknown) - 공백으로 대체
      if (fixed.indexOf('\t') !== -1) {
        issues.push('알 수 없는 탭: ' + fixed.indexOf('\t'));
        fixed = fixed.replace(/\t/g, ' ');
      }
      issues.push('탭문자 수정');
    }

    // 3. 폼피드 문자 (\f = \frac 깨짐)
    if (fixed.indexOf('\f') !== -1) {
      fixed = fixed.split('\frac').join('\\frac');
      if (fixed.indexOf('\f') !== -1) {
        fixed = fixed.replace(/\f/g, '');
      }
      issues.push('폼피드 수정');
    }

    // 이중 백슬래시 정리
    fixed = fixed.replace(/\\\\times/g, '\\times');
    fixed = fixed.replace(/\\\\triangle/g, '\\triangle');
    fixed = fixed.replace(/\\\\text/g, '\\text');
    fixed = fixed.replace(/\\\\frac/g, '\\frac');
    fixed = fixed.replace(/\\\\circ/g, '\\circ');

    if (fixed !== c.fullContent) {
      await p.concept.update({
        where: { id: c.id },
        data: { fullContent: fixed },
      });
      fixCount++;
      console.log(`  ${c.conceptCode}: ${issues.join(', ')}`);
    }
  }

  console.log(`\n수정: ${fixCount}개`);

  // 검증 - 탭/폼피드 문자 기준
  console.log('\n=== 최종 검증 ===');
  const after = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { conceptCode: true, fullContent: true },
  });

  let issueCount = 0;
  for (const c of after) {
    const content = c.fullContent || '';
    const problems: string[] = [];
    if (content.indexOf('\t') !== -1) problems.push('탭문자');
    if (content.indexOf('\f') !== -1) problems.push('폼피드');
    if (content.includes('**')) problems.push('볼드');
    if (content.includes('`')) problems.push('백틱');
    if (content.includes('^^')) problems.push('이중캐럿');
    const dollars = (content.match(/\$/g) || []).length;
    if (dollars % 2 !== 0) problems.push('$홀수');
    if (problems.length > 0) {
      issueCount++;
      console.log(`  ${c.conceptCode}: ${problems.join(', ')}`);
    }
  }
  console.log(`문제 있는 개념: ${issueCount}개`);

  // 온도 관련 확인
  for (const c of after) {
    if ((c.fullContent || '').includes('영상')) {
      const line = (c.fullContent || '').split('\n').find(l => l.includes('영상'));
      console.log(`\n온도 확인 (${c.conceptCode}): ${line}`);
    }
  }
}
main().then(() => p.$disconnect());
