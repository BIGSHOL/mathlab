/**
 * Client-safe chapter → domain / conceptCode 매핑 데이터
 * 서버(question-tagger.ts)와 클라이언트(useQuestionManager.ts) 양쪽에서 사용
 */

// ─── 학교급 판별 ───
export function detectSchoolLevel(bookCode: string): 'elementary' | 'middle' | 'high' {
  if (bookCode.startsWith('E')) return 'elementary';
  if (bookCode.startsWith('H')) return 'high';
  return 'middle';
}

// ─── 초등 chapter → domain 매핑 ───
export const ELEMENTARY_CHAPTER_DOMAIN: Record<string, string> = {
  '9까지의 수': 'CALCULATION',
  '여러 가지 모양': 'UNDERSTANDING',
  '덧셈과 뺄셈': 'CALCULATION',
  '비교하기': 'UNDERSTANDING',
  '50까지의 수': 'CALCULATION',
  '100까지의 수': 'CALCULATION',
  '덧셈과 뺄셈(1)': 'CALCULATION',
  '덧셈과 뺄셈(2)': 'CALCULATION',
  '덧셈과 뺄셈(3)': 'CALCULATION',
  '시계 보기와 규칙 찾기': 'REASONING',
  '세 자리 수': 'CALCULATION',
  '여러 가지 도형': 'UNDERSTANDING',
  '길이 재기': 'UNDERSTANDING',
  '분류하기': 'PROBLEM_SOLVING',
  '곱셈': 'CALCULATION',
  '네 자리 수': 'CALCULATION',
  '곱셈구구': 'CALCULATION',
  '시각과 시간': 'UNDERSTANDING',
  '표와 그래프': 'PROBLEM_SOLVING',
  '규칙 찾기': 'REASONING',
  '평면도형': 'UNDERSTANDING',
  '나눗셈': 'CALCULATION',
  '길이와 시간': 'UNDERSTANDING',
  '분수와 소수': 'CALCULATION',
  '원': 'UNDERSTANDING',
  '분수': 'CALCULATION',
  '들이와 무게': 'UNDERSTANDING',
  '자료의 정리': 'PROBLEM_SOLVING',
  '큰 수': 'CALCULATION',
  '각도': 'UNDERSTANDING',
  '곱셈과 나눗셈': 'CALCULATION',
  '평면도형의 이동': 'UNDERSTANDING',
  '막대그래프': 'PROBLEM_SOLVING',
  '분수의 덧셈과 뺄셈': 'CALCULATION',
  '삼각형': 'UNDERSTANDING',
  '소수의 덧셈과 뺄셈': 'CALCULATION',
  '사각형': 'UNDERSTANDING',
  '꺾은선그래프': 'PROBLEM_SOLVING',
  '다각형': 'UNDERSTANDING',
  '자연수의 혼합 계산': 'CALCULATION',
  '약수와 배수': 'CALCULATION',
  '규칙과 대응': 'REASONING',
  '약분과 통분': 'CALCULATION',
  '다각형의 둘레와 넓이': 'UNDERSTANDING',
  '수의 범위와 어림하기': 'CALCULATION',
  '분수의 곱셈': 'CALCULATION',
  '합동과 대칭': 'UNDERSTANDING',
  '소수의 곱셈': 'CALCULATION',
  '직육면체': 'UNDERSTANDING',
  '평균과 가능성': 'PROBLEM_SOLVING',
  '분수의 나눗셈': 'CALCULATION',
  '각기둥과 각뿔': 'UNDERSTANDING',
  '소수의 나눗셈': 'CALCULATION',
  '비와 비율': 'REASONING',
  '여러 가지 그래프': 'PROBLEM_SOLVING',
  '직육면체의 부피와 겉넓이': 'UNDERSTANDING',
  '비례식과 비례배분': 'REASONING',
  '원의 넓이': 'UNDERSTANDING',
  '원기둥, 원뿔, 구': 'UNDERSTANDING',
  '정비례와 반비례': 'REASONING',
};

// ─── 고등 chapter → domain 매핑 ───
export const HIGH_CHAPTER_DOMAIN: Record<string, string> = {
  '다항식': 'CALCULATION',
  '방정식과 부등식': 'CALCULATION',
  '경우의 수': 'PROBLEM_SOLVING',
  '행렬': 'CALCULATION',
  '도형의 방정식': 'REASONING',
  '집합과 명제': 'REASONING',
  '함수와 그래프': 'UNDERSTANDING',
  '지수함수와 로그함수': 'UNDERSTANDING',
  '삼각함수': 'UNDERSTANDING',
  '수열': 'CALCULATION',
  '수학적 모델링': 'PROBLEM_SOLVING',
  '함수의 극한과 연속': 'UNDERSTANDING',
  '미분': 'CALCULATION',
  '적분': 'CALCULATION',
  '이항정리': 'CALCULATION',
  '확률': 'PROBLEM_SOLVING',
  '통계': 'PROBLEM_SOLVING',
  '수열의 극한': 'UNDERSTANDING',
  '미분법': 'CALCULATION',
  '적분법': 'CALCULATION',
  '이차곡선': 'REASONING',
  '평면벡터': 'REASONING',
  '공간도형과 공간좌표': 'REASONING',
};

// ─── 중등 대단원 → domain 매핑 (section 매핑 실패 시 폴백) ───
export const MIDDLE_BROAD_DOMAIN: Record<string, string> = {
  '수와 연산': 'CALCULATION',
  '문자와 식': 'CALCULATION',
  '함수': 'UNDERSTANDING',
  '기하': 'REASONING',
  '확률과 통계': 'PROBLEM_SOLVING',
  '도형': 'REASONING',
  '통계': 'UNDERSTANDING',
};

// ─── 중등 소단원 → 중단원 매핑 (소인수분해 하위) ───
export const SECTION_TO_CHAPTER: Record<string, string> = {
  '소수와 합성수': '소인수분해',
  '소수와 합성수의 성질': '소인수분해',
  '거듭제곱': '소인수분해',
  '소인수 구하기': '소인수분해',
  '약수 구하기': '소인수분해',
  '약수의 개수 구하기': '소인수분해',
  '약수의 개수가 주어질 때 지수 구하기': '소인수분해',
  '제곱인 수 만들기': '소인수분해',
  '약수의 개수가 주어질 때 □ 안에 들어갈 수 있는 자연수 구하기': '소인수분해',
};

// ─── 중등 chapter → domain 매핑 ───
export const CHAPTER_DOMAIN: Record<string, string> = {
  '소인수분해': 'CALCULATION',
  '최대공약수와 최소공배수': 'CALCULATION',
  '정수와 유리수': 'UNDERSTANDING',
  '정수와 유리수의 계산': 'CALCULATION',
  '문자의 사용과 식의 계산': 'CALCULATION',
  '일차방정식의 풀이': 'CALCULATION',
  '일차방정식의 활용': 'PROBLEM_SOLVING',
  '좌표와 그래프': 'UNDERSTANDING',
  '정비례와 반비례': 'UNDERSTANDING',
  '기본 도형': 'UNDERSTANDING',
  '위치 관계': 'REASONING',
  '작도와 합동': 'REASONING',
  '다각형': 'REASONING',
  '원과 부채꼴': 'CALCULATION',
  '다면체와 회전체': 'UNDERSTANDING',
  '입체도형의 겉넓이와 부피': 'CALCULATION',
  '대푯값': 'UNDERSTANDING',
  '도수분포표와 상대도수': 'UNDERSTANDING',
  '유리수와 순환소수': 'CALCULATION',
  '단항식의 계산': 'CALCULATION',
  '다항식의 계산': 'CALCULATION',
  '일차부등식': 'CALCULATION',
  '일차부등식의 활용': 'PROBLEM_SOLVING',
  '연립일차방정식': 'CALCULATION',
  '연립일차방정식의 활용': 'PROBLEM_SOLVING',
  '일차함수와 그 그래프 ⑴': 'UNDERSTANDING',
  '삼각형의 성질': 'REASONING',
  '삼각형의 외심과 내심': 'REASONING',
  '삼각형의 무게중심': 'REASONING',
  '평행사변형': 'REASONING',
  '여러 가지 사각형': 'REASONING',
  '도형의 닮음': 'REASONING',
  '평행선 사이의 선분의 길이의 비': 'REASONING',
  '피타고라스 정리': 'REASONING',
  '경우의 수': 'PROBLEM_SOLVING',
  '제곱근의 뜻과 성질': 'UNDERSTANDING',
  '근호를 포함한 식의 계산': 'CALCULATION',
  '무리수와 실수': 'UNDERSTANDING',
  '다항식의 곱셈': 'CALCULATION',
  '다항식의 인수분해': 'CALCULATION',
  '이차방정식의 풀이': 'CALCULATION',
  '이차방정식의 활용': 'PROBLEM_SOLVING',
  '이차함수의 그래프 ⑴': 'UNDERSTANDING',
  '이차함수의 그래프 ⑵': 'UNDERSTANDING',
  '삼각비': 'CALCULATION',
  '삼각비의 활용': 'PROBLEM_SOLVING',
  '원과 직선': 'REASONING',
  '원주각': 'REASONING',
  '원주각의 활용': 'PROBLEM_SOLVING',
  '산포도': 'UNDERSTANDING',
  '상자그림과 산점도': 'UNDERSTANDING',
};

// ─── chapter → conceptCode 매핑 (주 개념) ───
export const CHAPTER_CONCEPT: Record<string, string> = {
  '소인수분해': 'M1-NUM-01',
  '최대공약수와 최소공배수': 'M1-NUM-02',
  '정수와 유리수': 'M1-NUM-03',
  '정수와 유리수의 계산': 'M1-NUM-04',
  '문자의 사용과 식의 계산': 'M1-ALG-01',
  '일차방정식의 풀이': 'M1-ALG-02',
  '일차방정식의 활용': 'M1-ALG-04',
  '좌표와 그래프': 'M1-FUNC-01',
  '정비례와 반비례': 'M1-FUNC-02',
  '기본 도형': 'M1-GEO-01',
  '위치 관계': 'M1-GEO-04',
  '작도와 합동': 'M1-GEO-02',
  '다각형': 'M1-GEO-03',
  '원과 부채꼴': 'M1-GEO-05',
  '다면체와 회전체': 'M1-GEO-06',
  '입체도형의 겉넓이와 부피': 'M1-GEO-07',
  '대푯값': 'M1-STA-01',
  '도수분포표와 상대도수': 'M1-STA-02',
  '유리수와 순환소수': 'M2-NUM-01',
  '단항식의 계산': 'M2-ALG-01',
  '다항식의 계산': 'M2-ALG-02',
  '일차부등식': 'M2-ALG-03',
  '일차부등식의 활용': 'M2-ALG-05',
  '연립일차방정식': 'M2-ALG-04',
  '연립일차방정식의 활용': 'M2-ALG-06',
  '일차함수와 그 그래프 ⑴': 'M2-FUNC-01',
  '삼각형의 성질': 'M2-GEO-03',
  '삼각형의 외심과 내심': 'M2-GEO-04',
  '삼각형의 무게중심': 'M2-GEO-07',
  '평행사변형': 'M2-GEO-05',
  '여러 가지 사각형': 'M2-GEO-06',
  '도형의 닮음': 'M2-GEO-07',
  '평행선 사이의 선분의 길이의 비': 'M2-GEO-07',
  '피타고라스 정리': 'M2-GEO-02',
  '경우의 수': 'M2-STA-01',
  '제곱근의 뜻과 성질': 'M3-NUM-01',
  '근호를 포함한 식의 계산': 'M3-NUM-02',
  '무리수와 실수': 'M3-NUM-04',
  '다항식의 곱셈': 'M3-ALG-01',
  '다항식의 인수분해': 'M3-ALG-02',
  '이차방정식의 풀이': 'M3-ALG-03',
  '이차방정식의 활용': 'M3-ALG-07',
  '이차함수의 그래프 ⑴': 'M3-FUNC-01',
  '이차함수의 그래프 ⑵': 'M3-FUNC-02',
  '삼각비': 'M3-GEO-01',
  '삼각비의 활용': 'M3-GEO-03',
  '원과 직선': 'M3-GEO-02',
  '원주각': 'M3-GEO-04',
  '원주각의 활용': 'M3-GEO-04',
  '산포도': 'M3-STA-01',
  '상자그림과 산점도': 'M3-STA-03',
};

/**
 * section에서 "유형 XX", "유형 UP XX", "01 " 등 접두사를 제거하여 중단원명 추출
 * 예: "유형 04 소인수분해" → "소인수분해"
 *     "01 소인수분해" → "소인수분해"
 *     "소인수분해" → "소인수분해"
 */
export function stripSectionPrefix(section: string): string {
  return section
    .replace(/^유형\s+(?:UP\s+)?\d+\s+/, '')  // "유형 04 ", "유형 UP 09 "
    .replace(/^\d+\s+/, '')                     // "01 "
    .trim();
}

/** 매핑 테이블에서 키를 찾는 내부 헬퍼 (exact → stripped → substring) */
function findInMap(map: Record<string, string>, text: string): string | null {
  // 1차: exact match
  if (map[text]) return map[text];
  // 2차: prefix 제거 후 match
  const stripped = stripSectionPrefix(text);
  if (stripped !== text && map[stripped]) return map[stripped];
  // 3차: 매핑 키가 text에 포함되는 경우 (longest match)
  let best: { key: string; val: string } | null = null;
  for (const [key, val] of Object.entries(map)) {
    if (text.includes(key) || stripped.includes(key)) {
      if (!best || key.length > best.key.length) {
        best = { key, val };
      }
    }
  }
  return best?.val ?? null;
}

/** section 텍스트에서 소단원→중단원 변환 시도 */
function resolveSection(section: string): string | null {
  const stripped = stripSectionPrefix(section);
  if (SECTION_TO_CHAPTER[stripped]) return SECTION_TO_CHAPTER[stripped];
  if (stripped !== section && SECTION_TO_CHAPTER[section]) return SECTION_TO_CHAPTER[section];
  // substring match (longest)
  let best: { key: string; val: string } | null = null;
  for (const [key, val] of Object.entries(SECTION_TO_CHAPTER)) {
    if (stripped.includes(key) || section.includes(key)) {
      if (!best || key.length > best.key.length) best = { key, val };
    }
  }
  return best?.val ?? null;
}

/** chapter + section + bookCode 기반 domain 자동 매핑 */
export function getDomainByChapter(chapter: string, bookCode: string, section?: string | null): string | null {
  const level = detectSchoolLevel(bookCode);
  const map = level === 'elementary'
    ? ELEMENTARY_CHAPTER_DOMAIN
    : level === 'high'
      ? HIGH_CHAPTER_DOMAIN
      : CHAPTER_DOMAIN;

  // chapter로 먼저 시도
  const byChapter = findInMap(map, chapter);
  if (byChapter) return byChapter;

  // section으로 재시도
  if (section) {
    const bySection = findInMap(map, section);
    if (bySection) return bySection;

    // 소단원→중단원 변환 후 재시도
    const resolved = resolveSection(section);
    if (resolved) {
      const byResolved = findInMap(map, resolved);
      if (byResolved) return byResolved;
    }
  }

  // 대단원 폴백 (중등만)
  if (level === 'middle' && MIDDLE_BROAD_DOMAIN[chapter]) {
    return MIDDLE_BROAD_DOMAIN[chapter];
  }
  return null;
}

/** section/difficulty 기반 domain 미세 조정 */
export function refineDomain(baseDomain: string, section?: string | null, difficulty?: string | null): string {
  const sec = section ?? '';
  if (sec.includes('활용') || sec.includes('서술형') || sec.includes('심화')) {
    if (baseDomain !== 'PROBLEM_SOLVING' && baseDomain !== 'REASONING') {
      return 'PROBLEM_SOLVING';
    }
  }
  if ((difficulty === 'HIGH' || difficulty === 'HIGHEST') && baseDomain === 'UNDERSTANDING') {
    return 'REASONING';
  }
  return baseDomain;
}

/** chapter 또는 section 기반 conceptCode 조회 */
export function getConceptCodeByChapter(chapter: string, section?: string | null): string | null {
  const byChapter = findInMap(CHAPTER_CONCEPT, chapter);
  if (byChapter) return byChapter;
  if (section) {
    const bySection = findInMap(CHAPTER_CONCEPT, section);
    if (bySection) return bySection;
    // 소단원→중단원 변환 후 재시도
    const resolved = resolveSection(section);
    if (resolved) return findInMap(CHAPTER_CONCEPT, resolved);
  }
  return null;
}
