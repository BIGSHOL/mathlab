import { prisma } from '@/lib/db';
import {
  detectSchoolLevel,
  ELEMENTARY_CHAPTER_DOMAIN,
  HIGH_CHAPTER_DOMAIN,
  CHAPTER_DOMAIN,
  CHAPTER_CONCEPT,
  refineDomain,
} from '@/lib/constants/question-maps';

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

// ── chapter → 5대 교육과정 영역 매핑 ──
const CHAPTER_TO_5DOMAIN: Record<string, string> = {
  // 초등
  '덧셈과 뺄셈': 'number', '곱셈': 'number', '나눗셈': 'number', '큰 수': 'number',
  '분수': 'number', '소수': 'number', '분수의 덧셈과 뺄셈': 'number', '분수의 곱셈': 'number',
  '분수의 나눗셈': 'number', '소수의 덧셈과 뺄셈': 'number', '소수의 곱셈': 'number',
  '소수의 나눗셈': 'number', '자연수의 혼합 계산': 'number', '약수와 배수': 'number',
  '약분과 통분': 'number', '수의 범위와 어림하기': 'number', '곱셈과 나눗셈': 'number',
  '곱셈구구': 'number', '비와 비율': 'number', '비례식과 비례배분': 'number',
  '규칙 찾기': 'algebra', '규칙과 대응': 'algebra',
  '평면도형': 'geometry', '여러 가지 모양': 'geometry', '삼각형': 'geometry', '사각형': 'geometry',
  '다각형': 'geometry', '원': 'geometry', '각도': 'geometry', '합동과 대칭': 'geometry',
  '평면도형의 이동': 'geometry', '직육면체': 'geometry', '각기둥과 각뿔': 'geometry',
  '원의 넓이': 'geometry', '원기둥, 원뿔, 구': 'geometry', '직육면체의 부피와 겉넓이': 'geometry',
  '다각형의 둘레와 넓이': 'geometry', '공간과 입체': 'geometry',
  '길이 재기': 'geometry', '길이와 시간': 'geometry', '들이와 무게': 'geometry',
  '시각과 시간': 'geometry', '비교하기': 'geometry',
  '표와 그래프': 'statistics', '막대그래프': 'statistics', '꺾은선그래프': 'statistics',
  '자료의 정리': 'statistics', '분류하기': 'statistics', '여러 가지 그래프': 'statistics',
  '평균과 가능성': 'statistics',
  // 중등
  '소인수분해': 'number', '정수와 유리수': 'number', '유리수와 순환소수': 'number',
  '실수와 그 연산': 'number',
  '문자의 사용과 식': 'algebra', '일차방정식': 'algebra', '식의 계산': 'algebra',
  '일차부등식': 'algebra', '연립일차방정식': 'algebra',
  '다항식의 곱셈과 인수분해': 'algebra', '이차방정식': 'algebra',
  '좌표와 그래프': 'function', '정비례와 반비례': 'function', '일차함수': 'function',
  '이차함수': 'function',
  '기본 도형': 'geometry', '작도와 합동': 'geometry', '입체도형': 'geometry',
  '삼각형의 성질': 'geometry', '사각형의 성질': 'geometry',
  '도형의 닮음': 'geometry', '피타고라스 정리': 'geometry',
  '삼각비': 'geometry', '원의 성질': 'geometry',
  '자료의 정리와 해석': 'statistics', '확률': 'statistics', '통계': 'statistics',
  // 고등
  '다항식': 'algebra', '방정식과 부등식': 'algebra', '행렬': 'algebra',
  '경우의 수': 'statistics', '집합과 명제': 'algebra',
  '도형의 방정식': 'geometry', '함수와 그래프': 'function',
  '지수함수와 로그함수': 'function', '삼각함수': 'function', '수열': 'number',
  '수학적 모델링': 'algebra',
  '함수의 극한과 연속': 'function', '미분': 'function', '적분': 'function',
  '수열의 극한': 'number', '미분법': 'function', '적분법': 'function',
  '이차곡선': 'geometry', '평면벡터': 'geometry', '공간도형과 공간좌표': 'geometry',
};

/** 문제의 chapter/section/difficulty/bookCode 기반으로 domain, abilityDomain, conceptId를 자동 결정 */
export async function autoTag(question: {
  chapter: string;
  section?: string | null;
  difficulty?: string | null;
  bookCode?: string;
}): Promise<{ domain: string | null; abilityDomain: string | null; conceptId: string | null }> {
  const level = detectSchoolLevel(question.bookCode ?? '');

  // 4대 능력 영역 (기존 매핑 유지)
  let baseAbility: string | undefined;
  if (level === 'elementary') {
    baseAbility = ELEMENTARY_CHAPTER_DOMAIN[question.chapter];
  } else if (level === 'high') {
    baseAbility = HIGH_CHAPTER_DOMAIN[question.chapter];
  } else {
    baseAbility = CHAPTER_DOMAIN[question.chapter];
  }
  const abilityDomain = baseAbility
    ? refineDomain(baseAbility, question.section, question.difficulty)
    : null;

  // 5대 교육과정 영역 (chapter 기반)
  const domain = CHAPTER_TO_5DOMAIN[question.chapter] ?? null;

  // conceptCode 매핑
  const conceptCode = CHAPTER_CONCEPT[question.chapter];
  let conceptId: string | null = null;

  if (conceptCode) {
    const cache = await getConceptCache();
    conceptId = cache.get(conceptCode) ?? null;
  }

  return { domain, abilityDomain, conceptId };
}

/** 매핑 가능한 chapter 목록 반환 (UI에서 활용) */
export function getChapterDomainMap(): Record<string, string> {
  return { ...ELEMENTARY_CHAPTER_DOMAIN, ...CHAPTER_DOMAIN, ...HIGH_CHAPTER_DOMAIN };
}

/** 매핑 가능한 chapter→conceptCode 목록 반환 */
export function getChapterConceptMap(): Record<string, string> {
  return { ...CHAPTER_CONCEPT };
}
