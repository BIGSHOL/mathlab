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

/** 문제의 chapter/section/difficulty/bookCode 기반으로 domain과 conceptId를 자동 결정 */
export async function autoTag(question: {
  chapter: string;
  section?: string | null;
  difficulty?: string | null;
  bookCode?: string;
}): Promise<{ domain: string | null; conceptId: string | null }> {
  const level = detectSchoolLevel(question.bookCode ?? '');

  let baseDomain: string | undefined;
  if (level === 'elementary') {
    baseDomain = ELEMENTARY_CHAPTER_DOMAIN[question.chapter];
  } else if (level === 'high') {
    baseDomain = HIGH_CHAPTER_DOMAIN[question.chapter];
  } else {
    baseDomain = CHAPTER_DOMAIN[question.chapter];
  }

  if (!baseDomain) {
    return { domain: null, conceptId: null };
  }

  const domain = refineDomain(baseDomain, question.section, question.difficulty);

  // conceptCode 매핑 (현재 중등만, 초등/고등은 null)
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
  return { ...ELEMENTARY_CHAPTER_DOMAIN, ...CHAPTER_DOMAIN, ...HIGH_CHAPTER_DOMAIN };
}

/** 매핑 가능한 chapter→conceptCode 목록 반환 */
export function getChapterConceptMap(): Record<string, string> {
  return { ...CHAPTER_CONCEPT };
}
