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

    // ========================================
    // LaTeX \t 탭 깨짐 일괄 복구
    // JS 문자열에서 \t=탭, \f=폼피드, \n=줄바꿈으로 해석되어 깨짐
    // ========================================

    // \times → 탭+imes
    if (fixed.includes('\times')) {
      fixed = fixed.split('\times').join('\\times');
      issues.push('\\times 복구');
    }

    // \triangle → 탭+riangle
    if (fixed.includes('\triangle')) {
      fixed = fixed.split('\triangle').join('\\triangle');
      issues.push('\\triangle 복구');
    }

    // \text → 탭+ext
    if (fixed.includes('\text')) {
      fixed = fixed.split('\text').join('\\text');
      issues.push('\\text 복구');
    }

    // \therefore → 탭+herefore
    if (fixed.includes('\therefore')) {
      fixed = fixed.split('\therefore').join('\\therefore');
      issues.push('\\therefore 복구');
    }

    // \tan → 탭+an (주의: 일반 단어 "탭+an"과 구별)
    // $ 안에서만 처리
    if (fixed.includes('\tan')) {
      fixed = fixed.split('\tan').join('\\tan');
      issues.push('\\tan 복구');
    }

    // \frac → 폼피드+rac
    if (fixed.includes('\frac')) {
      fixed = fixed.split('\frac').join('\\frac');
      issues.push('\\frac 복구');
    }

    // \neq → 줄바꿈+eq (이건 복잡 - 줄바꿈 처리)
    // 수식 안 \n이 줄바꿈이 되면 "eq" 가 줄 시작에 올 수 있음
    const lines = fixed.split('\n');
    let neqFixed = false;
    for (let i = 1; i < lines.length; i++) {
      if (/^eq\s/.test(lines[i]) && i > 0 && lines[i-1].includes('$')) {
        lines[i-1] = lines[i-1] + '\\neq' + lines[i].substring(2);
        lines.splice(i, 1);
        i--;
        neqFixed = true;
      }
    }
    if (neqFixed) {
      fixed = lines.join('\n');
      issues.push('\\neq 복구');
    }

    // 이중 백슬래시 정리 (\\\\times → \\times 등)
    fixed = fixed.replace(/\\\\times/g, '\\times');
    fixed = fixed.replace(/\\\\triangle/g, '\\triangle');
    fixed = fixed.replace(/\\\\text/g, '\\text');
    fixed = fixed.replace(/\\\\frac/g, '\\frac');
    fixed = fixed.replace(/\\\\therefore/g, '\\therefore');
    fixed = fixed.replace(/\\\\tan/g, '\\tan');
    fixed = fixed.replace(/\\\\neq/g, '\\neq');

    // ========================================
    // 마크다운 포매팅 정리
    // ========================================

    // 1. 볼드(**) 제거
    if (fixed.includes('**')) {
      fixed = fixed.replace(/\*\*/g, '');
      issues.push('볼드 제거');
    }

    // 2. 백틱 제거: `$...$` → $...$
    if (fixed.includes('`')) {
      fixed = fixed.replace(/`(\$[^`]*\$)`/g, '$1');
      fixed = fixed.replace(/`/g, '');
      issues.push('백틱 제거');
    }

    // 3. ### 마크다운 헤딩 제거
    if (fixed.includes('###')) {
      fixed = fixed.replace(/###\s*/g, '');
      issues.push('### 제거');
    }

    // 4. 연속 빈줄 제거
    const beforeLen = fixed.length;
    fixed = fixed.replace(/\n{3,}/g, '\n\n');
    if (fixed.length !== beforeLen) {
      issues.push('연속 빈줄 정리');
    }

    // ========================================
    // 온도 표기 수정: \triangle C → ^\circ\text{C}
    // (영상 5도 등의 표현에서 \triangle을 도 기호로 잘못 사용한 경우)
    // ========================================
    if (/\\triangle\s*C/.test(fixed)) {
      fixed = fixed.replace(/\\triangle\s*C/g, '^\\circ\\text{C}');
      issues.push('온도 기호 수정');
    }

    if (fixed !== c.fullContent) {
      await p.concept.update({
        where: { id: c.id },
        data: { fullContent: fixed },
      });
      fixCount++;
      console.log(`  ${c.conceptCode}: ${issues.join(', ')}`);
    }
  }

  console.log(`\n수정된 개념: ${fixCount}개`);

  // ========================================
  // 검증
  // ========================================
  console.log('\n=== 잔여 문제 검사 ===');
  const after = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { conceptCode: true, fullContent: true },
  });

  let issueCount = 0;
  for (const c of after) {
    const content = c.fullContent || '';
    const problems: string[] = [];
    if (content.includes('**')) problems.push('볼드');
    if (content.includes('`')) problems.push('백틱');
    if (content.includes('###')) problems.push('헤딩');
    // 탭 문자 잔존 체크 (LaTeX 깨짐 흔적)
    if (content.includes('\t')) problems.push('탭문자');
    // 폼피드 잔존
    if (content.includes('\f')) problems.push('폼피드');
    const dollars = (content.match(/\$/g) || []).length;
    if (dollars % 2 !== 0) problems.push('$홀수');
    // riangleC 같은 깨진 패턴
    if (/riangle[A-Z]/.test(content)) problems.push('\\triangle깨짐');
    if (/(?<![\\])imes/.test(content)) problems.push('\\times깨짐');
    if (/(?<![\\a-z])ext\{/.test(content)) problems.push('\\text깨짐');
    if (problems.length > 0) {
      issueCount++;
      console.log(`  ${c.conceptCode}: ${problems.join(', ')}`);
    }
  }
  console.log(`잔여 문제: ${issueCount}개`);

  // 온도 관련 개념 내용 확인
  console.log('\n=== 온도 관련 개념 확인 ===');
  for (const c of after) {
    if ((c.fullContent || '').includes('영상') || (c.fullContent || '').includes('영하')) {
      console.log(`\n${c.conceptCode}:`);
      const tempLines = (c.fullContent || '').split('\n').filter(l => l.includes('영상') || l.includes('영하'));
      tempLines.forEach(l => console.log(`  ${l}`));
    }
  }
}

main().then(() => p.$disconnect());
