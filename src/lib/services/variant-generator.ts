/**
 * 변형 시험지 생성기
 * 같은 범위(chapter)/난이도에서 문제 조합을 바꿔 여러 버전의 시험지 자동 생성
 *
 * ════════════════════════════════════════════════
 * 🔒 하드 제약 (HARD CONSTRAINTS) — 본 모듈 및 향후 AI 변형 확장 시 필수 준수
 * ════════════════════════════════════════════════
 * H1. 대체 후보 풀 규칙: 반드시 `chapter + difficulty`가 원본과 동일한 문제만. section 불일치는 허용하되,
 *     chapter/difficulty 중 하나라도 다르면 선택 금지. (현재 구현이 이 규칙을 만족해야 함)
 * H2. 중복 금지: `usedIds` 추적으로 **동일 변형 내부 + 변형 간** 중복 배정 금지. 후보 고갈 시 원본 유지(fallback).
 * H3. 문항 수 보존: 모든 변형은 원본과 동일한 `questionCount`와 동일한 sortOrder 길이를 가져야 함.
 * H4. 중간테이블 단일화 (2026-04-29): TestQuestion 중간테이블에만 기록 — Test.questionIds Json 컬럼 제거됨.
 *     읽기는 getTestQuestionIds() 헬퍼 통과 (중간테이블 정렬 결과 반환).
 * H5. 향후 AI 기반 "동형 문제(숫자만 다른 같은 유형)" 생성 시 프롬프트 제약:
 *     - 같은 개념·같은 풀이 구조 유지, 숫자/변수값만 변경
 *     - 난이도(difficulty) 유지, 정답 타입(MULTIPLE_CHOICE/SHORT_ANSWER/ESSAY) 유지
 *     - 원본과 동일한 choices 개수, 동일한 보기 포맷(<보기> 블록/cols 마커 포함)
 *     - 수식·숫자·변수는 $...$로 래핑. 한글은 $...$ 밖. \text{한글} 금지. \dfrac 금지 → \frac
 *     - 인접 수식 $A$$B$ 금지 → $A$ $B$. 도형 기호 □→\square, ○→\bigcirc
 *     - JSON 응답만(코드펜스·서술문 금지). 추측 금지 — 원본의 개념/단원/주제 범위 내에서만 변형
 *
 * 📤 자기검증:
 *   V1. 각 변형의 questionIds 길이 == 원본 length
 *   V2. 변형 간 문제 ID 교집합이 최소화되었는가 (후보 충분 시 0)
 *   V3. (AI 확장 시) 생성된 문제의 chapter/difficulty/type이 원본과 일치하는가
 * ════════════════════════════════════════════════
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

  // 이전 변형에서 사용된 문제 추적 (중복 방지)
  const usedIds = new Set(sourceQuestionIds);

  // 변형별 문제 조합을 먼저 계산 (DB 밖에서)
  const variantQuestionSets: string[][] = [];
  for (let v = 0; v < variantCount; v++) {
    const variantQuestionIds: string[] = [];
    for (const sq of sourceQuestions) {
      const pool = candidatePool.get(sq.id) ?? [];
      const available = pool.filter((id) => !usedIds.has(id));
      if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)];
        variantQuestionIds.push(picked);
        usedIds.add(picked);
      } else {
        variantQuestionIds.push(sq.id);
      }
    }
    variantQuestionSets.push(variantQuestionIds);
  }

  // 모든 변형 시험을 트랜잭션으로 일괄 생성
  const createdTests = await prisma.$transaction(async (tx) => {
    const results: { id: string; title: string; questionIds: string[] }[] = [];
    for (let v = 0; v < variantCount; v++) {
      const variantQuestionIds = variantQuestionSets[v];
      const test = await tx.test.create({
        data: {
          title: `${title} (변형 ${String.fromCharCode(65 + v)})`,
          grade,
          testType,
          questionCount: variantQuestionIds.length,
          timeLimitMin: timeLimitMin ?? null,
          shuffleOptions: shuffleOptions ?? false,
          maxAttempts: maxAttempts ?? null,
          createdBy,
        },
      });

      // 중간테이블 TestQuestion 기록 (questionIds Json 컬럼 제거 후 단일 진실의 원천)
      await tx.testQuestion.createMany({
        data: variantQuestionIds.map((qId: string, idx: number) => ({
          testId: test.id,
          questionId: qId,
          sortOrder: idx,
        })),
      });

      results.push({ id: test.id, title: test.title, questionIds: variantQuestionIds });
    }
    return results;
  });

  return createdTests;
}
