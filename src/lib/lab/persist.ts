// 🚧 Lab — 콘텐츠 토대 3단계: 생성/인제스트 문제 → LabProblem 영속 글루
//   GeneratedLabProblem(순수 생성 결과) → LabProblem 행. conceptId×difficulty×type 배치축을 채워
//   supplier(manual-supplier)가 처방대로 조회·공급할 수 있게 한다.
//   ⚠️ 격리(CLAUDE.md '형제 라인'): Lab 자기완결. 기출분석/mathgen 무import.
//   ⚠️ 토대2 generateProblemsForConcept는 "순수 생성만" — 영속은 여기(호출측 책임).
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { GeneratedLabProblem } from './problem-gen';

export interface PersistResult {
  created: number;
  problemIds: string[];
}

export interface PersistOptions {
  /** AI 합성=true(기본), 비전/OCR 인제스트(실 교재 문제)=false. LabProblem.isGenerated에 반영. */
  isGenerated?: boolean;
}

/**
 * 생성/인제스트 문제들을 특정 개념(conceptId)에 영속한다.
 * - LabGenType ≡ LabProblemType (MULTIPLE_CHOICE|SHORT_ANSWER|DESCRIPTIVE) — 동형 enum.
 * - 인라인 본문이므로 bodyRef는 'inline' 센티넬(스토리지 참조 부재 표시). body가 실 본문.
 * - choices는 객관식만(그 외 null → 컬럼 미설정). answer는 {choice|value|rubric} Json.
 * - source는 g.source(합성='ai-gemini-flash' / 인제스트='교재명·페이지') 그대로 기록.
 * - isGenerated: 합성=true(기본), 비전 인제스트=false(실 교재 문제) — opts로 구분.
 * 멱등성은 호출측 책임(중복 생성 방지가 필요하면 사전 조회). 여기선 받은 만큼 생성.
 */
export async function persistGeneratedProblems(
  conceptId: string,
  problems: GeneratedLabProblem[],
  opts: PersistOptions = {},
): Promise<PersistResult> {
  const isGenerated = opts.isGenerated ?? true;
  const problemIds: string[] = [];
  for (const g of problems) {
    const row = await prisma.labProblem.create({
      data: {
        conceptId,
        type: g.type, // LabGenType ≡ LabProblemType
        difficulty: g.difficulty,
        source: g.source,
        isGenerated,
        bodyRef: 'inline', // 인라인 본문 → 스토리지 키 센티넬
        body: g.body,
        choices: g.choices ? (g.choices as Prisma.InputJsonValue) : undefined,
        explanation: g.explanation || null,
        answer: g.answer as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    problemIds.push(row.id);
  }
  return { created: problemIds.length, problemIds };
}
