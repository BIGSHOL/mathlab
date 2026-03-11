import { prisma } from '@/lib/db';

// ─── chapter → domain 매핑 ───
const CHAPTER_DOMAIN: Record<string, string> = {
  // 중1 (1-1)
  '소인수분해': 'CALCULATION',
  '최대공약수와 최소공배수': 'CALCULATION',
  '정수와 유리수': 'UNDERSTANDING',
  '정수와 유리수의 계산': 'CALCULATION',
  '문자의 사용과 식의 계산': 'CALCULATION',
  '일차방정식의 풀이': 'CALCULATION',
  '일차방정식의 활용': 'PROBLEM_SOLVING',
  '좌표와 그래프': 'UNDERSTANDING',
  '정비례와 반비례': 'UNDERSTANDING',
  // 중1 (1-2)
  '기본 도형': 'UNDERSTANDING',
  '위치 관계': 'REASONING',
  '작도와 합동': 'REASONING',
  '다각형': 'REASONING',
  '원과 부채꼴': 'CALCULATION',
  '다면체와 회전체': 'UNDERSTANDING',
  '입체도형의 겉넓이와 부피': 'CALCULATION',
  '대푯값': 'UNDERSTANDING',
  '도수분포표와 상대도수': 'UNDERSTANDING',
  // 중2 (2-1)
  '유리수와 순환소수': 'CALCULATION',
  '단항식의 계산': 'CALCULATION',
  '다항식의 계산': 'CALCULATION',
  '일차부등식': 'CALCULATION',
  '일차부등식의 활용': 'PROBLEM_SOLVING',
  '연립일차방정식': 'CALCULATION',
  '연립일차방정식의 활용': 'PROBLEM_SOLVING',
  '일차함수와 그 그래프 ⑴': 'UNDERSTANDING',
  // 중2 (2-2)
  '삼각형의 성질': 'REASONING',
  '삼각형의 외심과 내심': 'REASONING',
  '삼각형의 무게중심': 'REASONING',
  '평행사변형': 'REASONING',
  '여러 가지 사각형': 'REASONING',
  '도형의 닮음': 'REASONING',
  '평행선 사이의 선분의 길이의 비': 'REASONING',
  '피타고라스 정리': 'REASONING',
  '경우의 수': 'PROBLEM_SOLVING',
  // 중3 (3-1)
  '제곱근의 뜻과 성질': 'UNDERSTANDING',
  '근호를 포함한 식의 계산': 'CALCULATION',
  '무리수와 실수': 'UNDERSTANDING',
  '다항식의 곱셈': 'CALCULATION',
  '다항식의 인수분해': 'CALCULATION',
  '이차방정식의 풀이': 'CALCULATION',
  '이차방정식의 활용': 'PROBLEM_SOLVING',
  '이차함수의 그래프 ⑴': 'UNDERSTANDING',
  '이차함수의 그래프 ⑵': 'UNDERSTANDING',
  // 중3 (3-2)
  '삼각비': 'CALCULATION',
  '삼각비의 활용': 'PROBLEM_SOLVING',
  '원과 직선': 'REASONING',
  '원주각': 'REASONING',
  '원주각의 활용': 'PROBLEM_SOLVING',
  '산포도': 'UNDERSTANDING',
  '상자그림과 산점도': 'UNDERSTANDING',
};

// ─── chapter → conceptCode 매핑 (주 개념) ───
const CHAPTER_CONCEPT: Record<string, string> = {
  // 중1 (1-1)
  '소인수분해': 'M1-NUM-01',
  '최대공약수와 최소공배수': 'M1-NUM-02',
  '정수와 유리수': 'M1-NUM-03',
  '정수와 유리수의 계산': 'M1-NUM-04',
  '문자의 사용과 식의 계산': 'M1-ALG-01',
  '일차방정식의 풀이': 'M1-ALG-02',
  '일차방정식의 활용': 'M1-ALG-04',
  '좌표와 그래프': 'M1-FUNC-01',
  '정비례와 반비례': 'M1-FUNC-02',
  // 중1 (1-2)
  '기본 도형': 'M1-GEO-01',
  '위치 관계': 'M1-GEO-04',
  '작도와 합동': 'M1-GEO-02',
  '다각형': 'M1-GEO-03',
  '원과 부채꼴': 'M1-GEO-05',
  '다면체와 회전체': 'M1-GEO-06',
  '입체도형의 겉넓이와 부피': 'M1-GEO-07',
  '대푯값': 'M1-STA-01',
  '도수분포표와 상대도수': 'M1-STA-02',
  // 중2 (2-1)
  '유리수와 순환소수': 'M2-NUM-01',
  '단항식의 계산': 'M2-ALG-01',
  '다항식의 계산': 'M2-ALG-02',
  '일차부등식': 'M2-ALG-03',
  '일차부등식의 활용': 'M2-ALG-05',
  '연립일차방정식': 'M2-ALG-04',
  '연립일차방정식의 활용': 'M2-ALG-06',
  '일차함수와 그 그래프 ⑴': 'M2-FUNC-01',
  // 중2 (2-2)
  '삼각형의 성질': 'M2-GEO-03',
  '삼각형의 외심과 내심': 'M2-GEO-04',
  '삼각형의 무게중심': 'M2-GEO-07',
  '평행사변형': 'M2-GEO-05',
  '여러 가지 사각형': 'M2-GEO-06',
  '도형의 닮음': 'M2-GEO-07',
  '평행선 사이의 선분의 길이의 비': 'M2-GEO-07',
  '피타고라스 정리': 'M2-GEO-02',
  '경우의 수': 'M2-STA-01',
  // 중3 (3-1)
  '제곱근의 뜻과 성질': 'M3-NUM-01',
  '근호를 포함한 식의 계산': 'M3-NUM-02',
  '무리수와 실수': 'M3-NUM-04',
  '다항식의 곱셈': 'M3-ALG-01',
  '다항식의 인수분해': 'M3-ALG-02',
  '이차방정식의 풀이': 'M3-ALG-03',
  '이차방정식의 활용': 'M3-ALG-07',
  '이차함수의 그래프 ⑴': 'M3-FUNC-01',
  '이차함수의 그래프 ⑵': 'M3-FUNC-02',
  // 중3 (3-2)
  '삼각비': 'M3-GEO-01',
  '삼각비의 활용': 'M3-GEO-03',
  '원과 직선': 'M3-GEO-02',
  '원주각': 'M3-GEO-04',
  '원주각의 활용': 'M3-GEO-04',
  '산포도': 'M3-STA-01',
  '상자그림과 산점도': 'M3-STA-03',
};

/** section/difficulty 기반 domain 미세 조정 */
function refineDomain(baseDomain: string, section?: string | null, difficulty?: string | null): string {
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

// conceptCode → DB id 캐시
let conceptCache: Map<string, string> | null = null;

async function getConceptCache(): Promise<Map<string, string>> {
  if (conceptCache) return conceptCache;
  const concepts = await prisma.concept.findMany({
    where: { conceptCode: { not: null } },
    select: { id: true, conceptCode: true },
  });
  conceptCache = new Map(concepts.map(c => [c.conceptCode!, c.id]));
  return conceptCache;
}

/** 문제의 chapter/section/difficulty 기반으로 domain과 conceptId를 자동 결정 */
export async function autoTag(question: {
  chapter: string;
  section?: string | null;
  difficulty?: string | null;
}): Promise<{ domain: string | null; conceptId: string | null }> {
  const baseDomain = CHAPTER_DOMAIN[question.chapter];
  if (!baseDomain) {
    return { domain: null, conceptId: null };
  }

  const domain = refineDomain(baseDomain, question.section, question.difficulty);
  const conceptCode = CHAPTER_CONCEPT[question.chapter];
  let conceptId: string | null = null;

  if (conceptCode) {
    const cache = await getConceptCache();
    conceptId = cache.get(conceptCode) ?? null;
  }

  return { domain, conceptId };
}

/** 매핑 가능한 chapter 목록 반환 (UI에서 활용) */
export function getChapterDomainMap(): Record<string, string> {
  return { ...CHAPTER_DOMAIN };
}

/** 매핑 가능한 chapter→conceptCode 목록 반환 */
export function getChapterConceptMap(): Record<string, string> {
  return { ...CHAPTER_CONCEPT };
}
