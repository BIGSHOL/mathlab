// 🚧 Lab — 콘텐츠 토대 2단계: AI 문제 생성기 (정규화·검증·매핑)
//   개념·난이도·유형 → 구조화 문제. AI 호출은 주입형(테스트는 결정적 스텁 → 실 API 비용 0).
//   ⚠️ 격리(CLAUDE.md '형제 라인'): 기출분석/mathgen 무import. AI는 ./ai-client(Lab 복제)만.
//   ⚠️ CLAUDE.md #0: 모델명 사용자 UI 비노출. #6: 생성 후 내용 최소검증. \dfrac→\frac 방어.
import { generateWithGemini, type GeminiGenInput, type GeminiGenRaw, type LabGenType } from './ai-client';

export type { LabGenType };

/** 정규화·검증된 생성 문제(영속 직전 형태). answer는 LabProblem.answer Json 규약과 일치. */
export interface GeneratedLabProblem {
  type: LabGenType;
  difficulty: number;
  body: string;
  choices: string[] | null; // 객관식만
  answer: Record<string, unknown>; // {choice:N} | {value:'s'} | {rubric:'...'}
  explanation: string;
  source: string; // 생성 모델/출처 태그
}

const SOURCE_TAG = 'ai-gemini-flash';

/** \dfrac→\frac 방어(인라인 거대분수 방지, CLAUDE.md 코딩 컨벤션). */
function fixDfrac(s: string): string {
  return typeof s === 'string' ? s.replace(/\\dfrac/g, '\\frac') : s;
}
/** 내용 최소검증(CLAUDE.md #6): 비어있지 않고 의미 있는 길이. */
function nonEmpty(s: unknown, min = 2): s is string {
  return typeof s === 'string' && s.trim().length >= min;
}
/** 보기 앞에 AI가 끼워넣은 번호/기호 제거(①②③④⑤, 1) 1. (1) 등) — 렌더 시 번호 중복 방지. */
function stripChoiceMarker(s: string): string {
  return s.replace(/^\s*(?:[①②③④⑤⑥⑦⑧⑨⑩]|\(?\d+\)|\d+[.)])\s*/, '').trim();
}

/** AI 원시 출력 → 검증된 GeneratedLabProblem. 검증 실패 시 throw(상위에서 스킵/재시도). */
export function normalizeGenerated(raw: GeminiGenRaw, type: LabGenType, difficulty: number): GeneratedLabProblem {
  if (!nonEmpty(raw?.body, 5)) throw new Error('생성 실패: body 누락/과소');
  const body = fixDfrac(raw.body);
  const explanation = fixDfrac(nonEmpty(raw?.explanation) ? raw.explanation : '');

  if (type === 'MULTIPLE_CHOICE') {
    const choices = Array.isArray(raw.choices) ? raw.choices.map((c) => stripChoiceMarker(fixDfrac(c))) : [];
    if (choices.length !== 5) throw new Error(`생성 실패: 보기 ${choices.length}개(5개 필요)`);
    const idx = Number(raw.answerIndex);
    if (!Number.isInteger(idx) || idx < 1 || idx > 5) throw new Error(`생성 실패: answerIndex ${raw.answerIndex}`);
    return { type, difficulty, body, choices, answer: { choice: idx }, explanation, source: SOURCE_TAG };
  }
  if (type === 'SHORT_ANSWER') {
    if (!nonEmpty(raw.answer, 1)) throw new Error('생성 실패: answer 누락');
    return { type, difficulty, body, choices: null, answer: { value: fixDfrac(raw.answer) }, explanation, source: SOURCE_TAG };
  }
  // DESCRIPTIVE
  if (!nonEmpty(raw.rubric, 5)) throw new Error('생성 실패: rubric 누락/과소');
  return { type, difficulty, body, choices: null, answer: { rubric: fixDfrac(raw.rubric) }, explanation, source: SOURCE_TAG };
}

// ── 주입형 AI 호출(테스트 $0) ──────────────────────────────────────────────
export type GenFn = (input: GeminiGenInput) => Promise<GeminiGenRaw>;
let activeGen: GenFn = generateWithGemini;
/** 테스트/DI용 — 결정적 스텁 주입(실 API 비용 0). */
export function setProblemGenerator(fn: GenFn): void {
  activeGen = fn;
}
/** 기본(AI) 구현 복원. */
export function resetProblemGenerator(): void {
  activeGen = generateWithGemini;
}

/** 단일 문제 생성(AI 호출 → 정규화). 검증 실패 시 throw. */
export async function generateProblem(input: GeminiGenInput): Promise<GeneratedLabProblem> {
  const raw = await activeGen(input);
  return normalizeGenerated(raw, input.type, input.difficulty);
}

export interface ConceptGenSpec {
  conceptName: string;
  majorUnit?: string;
  domain?: string;
  bandLabel?: string;
  /** [type, difficulty] 조합 목록. */
  plan: { type: LabGenType; difficulty: number }[];
}

/**
 * 한 개념에 대해 plan대로 여러 문제 생성. 개별 실패는 건너뛰고 수집(전체 중단 안 함).
 * 영속은 호출측 책임(스키마 컬럼 확정 후) — 여기선 순수 생성만.
 */
export async function generateProblemsForConcept(spec: ConceptGenSpec): Promise<{ ok: GeneratedLabProblem[]; failed: { type: LabGenType; difficulty: number; error: string }[] }> {
  const ok: GeneratedLabProblem[] = [];
  const failed: { type: LabGenType; difficulty: number; error: string }[] = [];
  for (const p of spec.plan) {
    try {
      ok.push(
        await generateProblem({
          conceptName: spec.conceptName,
          majorUnit: spec.majorUnit,
          domain: spec.domain,
          bandLabel: spec.bandLabel,
          type: p.type,
          difficulty: p.difficulty,
        }),
      );
    } catch (e) {
      failed.push({ type: p.type, difficulty: p.difficulty, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok, failed };
}
