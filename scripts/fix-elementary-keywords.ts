/**
 * 초등 개념 키워드 품질 개선 스크립트
 *
 * 문제:
 * - 키워드가 붙여쓰기로 저장되어 본문에서 매칭 안됨 (예: "분수덧셈" vs "분수의 덧셈")
 * - 키워드가 1개뿐인 개념이 있어 빈칸 출제 다양성 부족
 * - 본문에 없는 추상적 키워드 (예: "실생활 예시", "기본 원리")
 *
 * 해결:
 * 1. 본문에서 실제 등장하는 수학 핵심 용어를 자동 추출
 * 2. 기존 키워드 중 본문에 등장하는 것은 유지
 * 3. 미등장 키워드는 본문에서 매칭되는 변형 찾기 (띄어쓰기/조사 변형)
 * 4. 최소 3개 이상 키워드 보장
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 수학 핵심 용어 사전 (본문에서 이 단어들을 우선적으로 추출)
// ★ 2글자 미만 단어는 제외 (만, 억, 조, 구, 각, 면, 비, 표 등은 문맥 무관 매칭 위험)
// ★ 초등 교육과정 전 단원 핵심 용어 포함
const MATH_TERMS = [
  // 기본 연산
  '덧셈', '뺄셈', '곱셈', '나눗셈', '사칙연산',
  '받아올림', '받아내림', '올림', '버림', '반올림',
  '세로셈', '가로셈', '어림셈', '암산',
  '부분 곱', '교환법칙', '결합법칙', '분배법칙',

  // 수와 연산
  '자릿값', '일의 자리', '십의 자리', '백의 자리', '천의 자리',
  '큰 수', '자릿수', '뛰어 세기',
  '홀수', '짝수', '약수', '배수', '공약수', '공배수',
  '최대공약수', '최소공배수',
  '합성수', '소인수분해',
  '나누어지는 수', '나누는 수', '나누어떨어짐',

  // 분수
  '분수', '분모', '분자', '진분수', '가분수', '대분수',
  '동분모', '이분모', '통분', '약분', '기약분수',
  '단위분수', '등분', '분수의 크기',
  '분수의 덧셈', '분수의 뺄셈', '분수의 곱셈', '분수의 나눗셈',

  // 소수(decimal)
  '소수', '소수점', '소수 첫째 자리', '소수 둘째 자리',
  '소수의 덧셈', '소수의 뺄셈', '소수의 곱셈', '소수의 나눗셈',

  // 도형 기초
  '선분', '반직선', '직선', '평행선', '수선', '수직',
  '직각', '예각', '둔각', '평각',
  '평면도형',

  // 삼각형
  '삼각형', '직각삼각형', '이등변삼각형', '정삼각형',
  '둔각삼각형', '예각삼각형',

  // 사각형
  '사각형', '직사각형', '정사각형', '평행사변형', '마름모', '사다리꼴',

  // 다각형
  '오각형', '육각형', '다각형', '정다각형',

  // 원
  '반지름', '지름', '원주', '원주율', '원의 중심', '원의 넓이',
  '컴퍼스',

  // 도형 요소
  '꼭짓점', '모서리', '대각선',
  '밑변', '높이', '넓이', '둘레', '부피', '겉넓이',
  '가로', '세로',

  // 입체도형
  '직육면체', '정육면체', '각기둥', '각뿔', '원기둥', '원뿔',
  '전개도', '쌓기나무', '투영도', '회전체',
  '밑면', '옆면',

  // 측정
  '센티미터', '밀리미터', '미터', '킬로미터',
  '리터', '밀리리터', '킬로그램', '그램',
  '시간', '들이', '무게', '길이',
  '각도', '각도기', '삼각자',
  '넓이 단위', '부피 단위',

  // 규칙/관계
  '규칙', '대응', '대응 관계', '규칙 찾기', '규칙과 대응',
  '비율', '백분율', '비례식', '비례배분',
  '비의 값', '외항', '내항', '비의 성질',

  // 자료/통계
  '막대그래프', '꺾은선그래프', '그림그래프',
  '띠그래프', '원그래프', '평균',
  '가능성', '자료', '중심각',

  // 대칭/이동
  '합동', '대칭', '선대칭', '점대칭', '대칭축',
  '밀기', '뒤집기', '돌리기',
  '대응점', '대응변', '대응각',

  // 범위/어림
  '이상', '이하', '초과', '미만', '수의 범위',
  '근삿값',

  // 연산 관련
  '나머지', '검산', '역수', '혼합 계산',

  // 큰 수 관련
  '만의 자리', '천만', '십억', '백억', '천억',
  '부등호',
];

// 한글 핵심 용어 추출 (본문에서 2~6글자 한글 단어)
function extractKoreanTerms(text: string): string[] {
  // KaTeX 수식 제거
  const noLatex = text.replace(/\$[^$]+\$/g, ' ');
  // 한글 연속 2~8글자 추출
  const matches = noLatex.match(/[가-힣]{2,8}/g) || [];

  // 빈도 카운트
  const freq = new Map<string, number>();
  for (const m of matches) {
    freq.set(m, (freq.get(m) || 0) + 1);
  }

  // 불용어 필터 — 서술어/접속사/일반 동사/조사 붙은 일반어 등 빈칸으로 부적합한 단어
  const stopWords = new Set([
    // 서술어/어미
    '것이', '있는', '없는', '하는', '되는', '같은', '이런', '그런', '저런',
    '있습니다', '됩니다', '합니다', '입니다', '습니다', '봅시다', '봅니다',
    '있으며', '있어요', '있지요', '있답니다', '해요', '해봐요', '이에요',
    '거예요', '거랍니다', '거죠', '할까요', '볼까요', '일까요',
    '이랍니다', '이지요', '랍니다', '인데요', '세요', '내요',
    // 접속사/부사
    '또한', '이처럼', '이때', '예를', '들어', '때문',
    '다음', '먼저', '마지막', '그리고', '하지만', '따라서', '그러면',
    '그래서', '왜냐하면', '이렇게', '여기서', '어떤', '모든', '각각',
    '우리', '보통', '항상', '반드시', '정확하게', '편리하게',
    '그러나', '그러므로', '그래서', '그렇게', '그런데', '그래도',
    '이러한', '이것은', '이것이', '이처럼', '이렇게', '저렇게',
    // 일반 서술
    '경우에', '경우는', '때에는', '때는', '에서는',
    '말합니다', '부릅니다', '나타냅니다', '의미합니다',
    '중요합니다', '사용합니다', '필요합니다',
    '알아볼까요', '살펴봅시다', '알아봅시다',
    '수학에서', '계산할', '구할', '나타낼',
    '자리에', '자리의', '자리를', '자리가',
    '라고', '이므로', '입니다',
    '같습니다', '것입니다',
    '한다면', '한다는', '하여', '라면', '으면',
    '때문에', '하면서', '하려면', '해야', '해서',
    '수있습니다', '뿐입니다', '있으므로',
    '번째', '하나의', '이라고', '같이',
    // ★ 빈칸으로 부적합한 일반 단어 (수학 용어가 아닌 것)
    '보다', '모두', '수를', '수가', '수는', '수의', '값을', '값이', '값은',
    '안녕', '친구', '친구들', '오늘', '오늘은', '여러', '이름',
    '보기', '보면', '보세요', '봐요', '볼까', '봅시다',
    '나누', '나누어', '나누어지', '나누는', '똑같', '똑같이',
    '쉽게', '쉬운', '정확한', '편리한', '다양한', '특별한', '중요한',
    '아주', '매우', '훨씬', '가장', '바로', '이런', '그런', '같이',
    '두가지', '여러가지', '한가지',
    '처럼', '때처럼', '뿐만', '아니라', '아닌',
    '제외', '아래', '위에', '사이', '쪽으로',
    '적용', '연습', '실력', '실수',
    '자리에서', '자리로', '자리까지',
    '시계판', '초침이', '무게를', '시간을', '크기를',
    '들이는', '들이가', '나누어지는', '비율을', '자료를',
    '전체에서', '백분율을', '숫자로',
    '할수', '될수', '있으면', '되면', '이면',
  ]);

  return Array.from(freq.entries())
    .filter(([term]) => {
      if (stopWords.has(term)) return false;
      if (term.length < 2) return false;
      // 서술형 어미로 끝나는 단어 자동 제외
      if (/[에를을는은이가의로]$/.test(term) && term.length <= 3) return false;
      // ~해요, ~해봐요, ~돼요 등 서술 종결어미
      if (/(?:해요|돼요|봐요|거예요|이에요|이랍니다|할까요)$/.test(term)) return false;
      return true;
    })
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);
}

// 본문에서 MATH_TERMS 사전과 매칭되는 용어 찾기
function findMathTermsInContent(content: string): string[] {
  const found: string[] = [];
  for (const term of MATH_TERMS) {
    if (content.includes(term)) {
      found.push(term);
    }
  }
  // 긴 용어 우선 (더 구체적인 용어가 먼저)
  return found.sort((a, b) => b.length - a.length);
}

// KaTeX 수식 중 빈칸으로 만들만한 것 추출
// ★ 공식/정의에 해당하는 핵심 수식만 (단순 숫자 $10$ 등은 제외)
function findLatexTerms(content: string): string[] {
  const matches = content.match(/\$[^$]+\$/g) || [];
  const candidates: string[] = [];

  for (const m of matches) {
    const inner = m.slice(1, -1).trim();
    // 단순 숫자만 있는 것 제외 (예: $10$, $3$)
    if (/^\d+$/.test(inner)) continue;
    // 너무 짧은 것 제외 (예: $a$, $n$)
    if (inner.length <= 2) continue;
    // 의미있는 수식만 (공식, 단위, 연산 포함)
    if (inner.includes('\\times') || inner.includes('\\div') ||
        inner.includes('\\frac') || inner.includes('\\pi') ||
        inner.includes('^') || inner.includes('\\text')) {
      if (m.length >= 5 && m.length <= 40) { // 적절한 길이
        candidates.push(m);
      }
    }
  }

  return candidates.slice(0, 2); // 최대 2개
}

// 기존 키워드 중 본문에 등장하고 빈칸에 적합한 것만 필터
function filterValidKeywords(keywords: string[], content: string): string[] {
  return keywords.filter(kw => {
    // 1글자 한글 키워드는 부적합 (만, 각, 면, 구, 비, 표, 원, 초, 분, 시 등)
    if (/^[가-힣]$/.test(kw)) return false;
    // 1글자 영문/기호도 제외 (s, m, L 등은 단독으로 빈칸 부적합)
    if (kw.length === 1) return false;
    // 잘못 잘린 키워드 제거 (예: "띠의 길" — 원래 "띠의 길이"가 조사 제거로 잘림)
    // 한글 단어가 '길', '값', '수' 등으로 끝나면서 원래 더 긴 단어가 본문에 있으면 제거
    if (!kw.startsWith('$') && /[가-힣]$/.test(kw)) {
      const extendedVersions = ['이', '을', '의', '에'];
      for (const ext of extendedVersions) {
        const longer = kw + ext;
        if (content.includes(longer) && !content.includes(kw + ' ') &&
            content.indexOf(kw) === content.indexOf(longer)) {
          return false; // 원래 더 긴 단어의 잘린 버전
        }
      }
    }
    // KaTeX 포함 키워드 (예: $90^\circ$)
    if (kw.includes('$')) return content.includes(kw);
    // 일반 키워드
    return content.includes(kw);
  });
}

// 키워드 중복 제거 (부분 문자열 관계 고려)
// ★ 단, 둘 다 수학 용어 사전에 있는 경우는 부분문자열이어도 각각 유지
//   (예: "직각" ⊂ "직각삼각형" 이지만 둘 다 독립적인 수학 용어)
function deduplicateKeywords(keywords: string[]): string[] {
  const mathTermSet = new Set(MATH_TERMS);
  const result: string[] = [];
  const sorted = [...keywords].sort((a, b) => b.length - a.length);

  for (const kw of sorted) {
    const isDuplicate = result.includes(kw);
    if (isDuplicate) continue;

    // 둘 다 수학 사전 용어이면 부분문자열이어도 유지
    const isMathTerm = mathTermSet.has(kw);
    const isSubstring = result.some(existing => {
      if (existing.includes(kw) && existing !== kw) {
        // 둘 다 수학 용어면 독립 유지
        if (isMathTerm && mathTermSet.has(existing)) return false;
        return true;
      }
      return false;
    });

    if (!isSubstring) {
      result.push(kw);
    }
  }

  return result;
}

async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { id: true, conceptCode: true, title: true, keywords: true, fullContent: true, grade: true },
    orderBy: [{ grade: 'asc' }, { conceptCode: 'asc' }],
  });

  console.log(`초등 개념 ${concepts.length}개 분석 시작...\n`);

  let fixedCount = 0;
  let alreadyOkCount = 0;
  const updates: { id: string; code: string; oldKw: string; newKw: string; reason: string }[] = [];

  for (const c of concepts) {
    const content = c.fullContent || '';
    const oldKwList = (c.keywords || '').split(',').map(s => s.trim()).filter(Boolean);

    // ===== 새로운 키워드 선정 로직 (MATH_TERMS 사전 최우선) =====

    // 1단계: 수학 용어 사전에서 본문에 등장하는 용어 수집
    const mathTerms = findMathTermsInContent(content);

    // 2단계: KaTeX 수식 중 의미있는 것
    const latexTerms = findLatexTerms(content);

    // 3단계: 기존 키워드 중 본문에 등장하면서 MATH_TERMS에도 있는 것
    const mathTermSet = new Set(MATH_TERMS);
    const validOldMath = filterValidKeywords(oldKwList, content).filter(kw =>
      kw.startsWith('$') || mathTermSet.has(kw)
    );

    // 합치기: 사전 매칭 > 기존 유효 수학 키워드 > KaTeX
    let combined = [...validOldMath];

    // 수학 사전 용어 추가
    for (const t of mathTerms) {
      if (!combined.includes(t) && !combined.some(e => e.includes(t) || t.includes(e))) {
        combined.push(t);
      }
    }

    // KaTeX 수식 추가
    for (const t of latexTerms) {
      if (!combined.includes(t)) {
        combined.push(t);
      }
    }

    // 4단계: 기존 키워드 중 본문에 등장하지만 사전에 없는 것도 보충 (2단어 이상 복합어만)
    if (combined.length < 4) {
      const validOldComplex = filterValidKeywords(oldKwList, content).filter(kw =>
        !kw.startsWith('$') && !mathTermSet.has(kw) && kw.includes(' ') && kw.length >= 4
      );
      for (const t of validOldComplex) {
        if (!combined.includes(t) && !combined.some(e => e.includes(t))) {
          combined.push(t);
          if (combined.length >= 5) break;
        }
      }
    }

    // 5단계: 최후의 보충 — 본문 한글 빈도 용어 (사전에 없는 경우만, 매우 엄격)
    if (combined.length < 3) {
      const koreanTerms = extractKoreanTerms(content);
      for (const t of koreanTerms) {
        if (t.length >= 3 && !combined.includes(t) && content.includes(t) &&
            !combined.some(e => e.includes(t))) {
          combined.push(t);
          if (combined.length >= 3) break;
        }
      }
    }

    // 중복 제거
    combined = deduplicateKeywords(combined);

    // 최종 필터: 1글자 제거
    combined = combined.filter(kw => {
      if (kw.startsWith('$')) return true;
      return kw.length >= 2;
    });

    // 중복 제거
    combined = [...new Set(combined)];

    const newKwStr = combined.join(',');
    const oldKwStr = oldKwList.join(',');

    // 변경 필요한지 확인
    const oldMissing = oldKwList.filter(k => !content.includes(k));
    const oldSingleChar = oldKwList.filter(k => k.length === 1 && !k.startsWith('$'));
    const needsFix = oldMissing.length > 0 || oldKwList.length <= 1 || oldSingleChar.length > 0 ||
      newKwStr !== oldKwStr; // 내용이 달라지면 업데이트

    if (needsFix) {
      const reasons: string[] = [];
      if (oldMissing.length > 0) reasons.push(`미등장 ${oldMissing.length}개 제거`);
      if (oldSingleChar.length > 0) reasons.push(`1글자 ${oldSingleChar.length}개 제거`);
      if (oldKwList.length <= 1) reasons.push(`키워드 부족(${oldKwList.length}→${combined.length})`);
      if (combined.length > validOldMath.length) reasons.push(`+${combined.length - validOldMath.length}개 추가`);

      updates.push({
        id: c.id,
        code: c.conceptCode || '',
        oldKw: oldKwStr,
        newKw: newKwStr,
        reason: reasons.join(', '),
      });
      fixedCount++;
    } else {
      alreadyOkCount++;
    }
  }

  // 변경 내역 출력
  console.log('=== 변경 계획 ===\n');

  let currentGrade = '';
  for (const u of updates) {
    const grade = u.code.substring(0, 2);
    if (grade !== currentGrade) {
      currentGrade = grade;
      const gradeName = { E3: '초3', E4: '초4', E5: '초5', E6: '초6' }[grade] || grade;
      console.log(`\n--- ${gradeName} ---`);
    }
    console.log(`${u.code} | ${u.reason}`);
    console.log(`  기존: ${u.oldKw}`);
    console.log(`  변경: ${u.newKw}`);
  }

  console.log(`\n=== 요약 ===`);
  console.log(`전체: ${concepts.length}개`);
  console.log(`양호 (변경 불필요): ${alreadyOkCount}개`);
  console.log(`수정 대상: ${fixedCount}개`);

  // 실제 DB 업데이트
  if (updates.length > 0) {
    console.log(`\nDB 업데이트 중...`);

    let updated = 0;
    for (const u of updates) {
      await prisma.concept.update({
        where: { id: u.id },
        data: { keywords: u.newKw },
      });
      updated++;
    }

    console.log(`${updated}개 개념 키워드 업데이트 완료!`);
  }

  // 업데이트 후 검증
  console.log('\n=== 업데이트 후 검증 ===');
  const afterConcepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { conceptCode: true, keywords: true, fullContent: true },
  });

  let stillBad = 0;
  for (const c of afterConcepts) {
    const content = c.fullContent || '';
    const kwList = (c.keywords || '').split(',').map(s => s.trim()).filter(Boolean);
    const missing = kwList.filter(k => !content.includes(k));
    if (missing.length > 0 || kwList.length < 2) {
      stillBad++;
      if (stillBad <= 5) {
        console.log(`  여전히 이슈: ${c.conceptCode} | kw:${kwList.length} | 미등장:${missing.length} [${missing.join(',')}]`);
      }
    }
  }
  console.log(`남은 이슈: ${stillBad}개 / ${afterConcepts.length}개`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
