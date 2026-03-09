/**
 * 변형 시험지 생성기
 * 같은 범위(chapter)/난이도에서 문제 조합을 바꿔 여러 버전의 시험지 자동 생성
 */

import { prisma } from '@/lib/db';

interface VariantConfig {
  /** 원본 시험의 문제 ID 배열 */
  sourceQuestionIds: string[];
  /** 생성할 변형 시험 수 */
  variantCount: number;
  /** 기본 시험 정보 */
  title: string;
  grade: number;
  testType: string;
  createdBy: string;
  timeLimitMin?: number;
  shuffleOptions?: boolean;
  maxAttempts?: number | null;
}

/**
 * 원본 문제 기반으로 유사 문제 풀에서 변형 시험지 생성
 * - 각 문제에 대해 같은 chapter + difficulty의 다른 문제를 찾아 대체
 * - 대체할 문제가 없으면 원본 유지
 */
export async function generateVariants(config: VariantConfig) {
  const { sourceQuestionIds, variantCount, title, grade, testType, createdBy, timeLimitMin, shuffleOptions, maxAttempts } = config;

  // 원본 문제 정보 조회
  const sourceQuestions = await prisma.question.findMany({
    where: { id: { in: sourceQuestionIds } },
    select: { id: true, chapter: true, section: true, difficulty: true },
  });

  // 문제별 대체 후보 풀 구축
  const candidatePool: Map<string, string[]> = new Map();

  for (const sq of sourceQuestions) {
    // 같은 chapter + difficulty의 다른 문제 검색
    const candidates = await prisma.question.findMany({
      where: {
        chapter: sq.chapter,
        difficulty: sq.difficulty,
        id: { notIn: sourceQuestionIds },
      },
      select: { id: true },
      take: 50,
    });
    candidatePool.set(sq.id, candidates.map((c) => c.id));
  }

  const createdTests: { id: string; title: string; questionIds: string[] }[] = [];

  // 이전 변형에서 사용된 문제 추적 (중복 방지)
  const usedIds = new Set(sourceQuestionIds);

  for (let v = 0; v < variantCount; v++) {
    const variantQuestionIds: string[] = [];

    for (const sq of sourceQuestions) {
      const pool = candidatePool.get(sq.id) ?? [];
      // 아직 사용되지 않은 후보 중 하나 선택
      const available = pool.filter((id) => !usedIds.has(id));

      if (available.length > 0) {
        // 랜덤 선택
        const picked = available[Math.floor(Math.random() * available.length)];
        variantQuestionIds.push(picked);
        usedIds.add(picked);
      } else {
        // 대체 불가 → 원본 유지
        variantQuestionIds.push(sq.id);
      }
    }

    // 변형 시험 생성
    const test = await prisma.test.create({
      data: {
        title: `${title} (변형 ${String.fromCharCode(65 + v)})`,
        grade,
        testType,
        questionIds: variantQuestionIds,
        questionCount: variantQuestionIds.length,
        timeLimitMin: timeLimitMin ?? null,
        shuffleOptions: shuffleOptions ?? false,
        maxAttempts: maxAttempts ?? null,
        createdBy,
      },
    });

    createdTests.push({
      id: test.id,
      title: test.title,
      questionIds: variantQuestionIds,
    });
  }

  return createdTests;
}
