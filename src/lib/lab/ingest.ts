// 🚧 Lab — 콘텐츠 토대 3단계(인제스트): 세션 비전 OCR 결과 → 검증된 LabProblem 입력
//   교재 PDF를 세션(Claude Code)이 비전으로 판독해 작성한 인제스트 문서(JSON)를 검증·매핑한다.
//   ⚠️ 비용: 세션 비전 = API ₩0(시험지변환기 입증 패턴). 런타임 Gemini 호출 없음.
//   ⚠️ 격리(CLAUDE.md '형제 라인'): Lab 자기완결. 검증은 토대2 normalizeGenerated 재사용(중복 방지).
//   ⚠️ 합성(generateProblemsForConcept)과 동일 GeneratedLabProblem로 수렴 → persist.ts 공용.
import type { GeminiGenRaw } from './ai-client';
import { normalizeGenerated, type GeneratedLabProblem, type LabGenType } from './problem-gen';

/** 세션이 한 문제를 판독해 적는 형식. GeminiGenRaw + {type, difficulty} (합성 raw와 동형). */
export interface IngestProblemInput {
  type: LabGenType; // MULTIPLE_CHOICE | SHORT_ANSWER | DESCRIPTIVE
  difficulty: number; // 1..5 (세션이 2축 모델로 판정)
  body: string; // 단일 마크다운 + 인라인 $...$ KaTeX (블록 분할 금지 — 변환기와 반대)
  choices?: string[] | null; // 객관식 보기(5) — 번호 마커 없이 내용만
  answerIndex?: number; // 객관식 정답(1-based)
  answer?: string; // 단답 정답
  rubric?: string; // 서술형 채점 루브릭(모범답안 + 기준)
  explanation?: string; // 해설/풀이 (없으면 '')
  // 🚧 토대4: 도형 스펙(도형 문제만). DiagramParam[] 배열(네이티브, PDF추출과 동형) 또는 DiagramSpec 객체.
  diagram?: unknown;
}

// 🚧 토대4: 인제스트 diagram 라이트 검증 — 배열(DiagramParam[]) 또는 객체(DiagramSpec). 깊은 검증/미지 타입은 렌더러가 흡수(null 반환).
function validateDiagram(d: unknown): unknown {
  if (d == null) return null;
  if (Array.isArray(d)) {
    if (d.length === 0) return null;
    for (const el of d) {
      if (!el || typeof el !== 'object' || typeof (el as { type?: unknown }).type !== 'string')
        throw new Error('diagram 배열 원소는 {type, params} 객체여야 함');
    }
    return d;
  }
  if (typeof d === 'object') {
    if (typeof (d as { type?: unknown }).type !== 'string') throw new Error('diagram.type(문자열) 누락');
    return d;
  }
  throw new Error('diagram은 배열(DiagramParam[]) 또는 객체(DiagramSpec)여야 함');
}

/** 한 단원(개념)에 대한 세션 비전 인제스트 문서. */
export interface IngestDoc {
  source: string; // 출처: 교재명·출판사·페이지 (예: "동아(강옥기) 중1 p.42")
  conceptId: string; // 대상 LabConcept id (세션이 단원→개념 매핑하여 지정)
  problems: IngestProblemInput[];
}

export interface ParsedIngest {
  source: string;
  conceptId: string;
  problems: GeneratedLabProblem[]; // 검증 통과분
  errors: { index: number; error: string }[]; // 개별 실패(전체 중단 안 함)
}

const TYPES: LabGenType[] = ['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'DESCRIPTIVE'];
function nonEmptyStr(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

/**
 * 세션 비전 인제스트 문서 → 검증된 GeneratedLabProblem[].
 * - 문서 수준 오류(source/conceptId/problems 누락)는 throw.
 * - 문항 수준 검증은 토대2 `normalizeGenerated` 재사용(body/보기5/answerIndex/answer/rubric + \dfrac·마커 정규화).
 *   추가로 type 화이트리스트 + difficulty 1..5 범위를 강제(normalizeGenerated는 difficulty 미검사).
 * - source는 교재 출처로 오버라이드(normalizeGenerated 기본값 'ai-gemini-flash' 대체).
 * - 개별 문항 실패는 errors로 수집해 나머지는 살린다(전체 중단 X).
 */
export function parseIngestDoc(doc: IngestDoc): ParsedIngest {
  if (!doc || typeof doc !== 'object') throw new Error('인제스트 문서 형식 오류');
  if (!nonEmptyStr(doc.source)) throw new Error('source(교재·페이지) 필수');
  if (!nonEmptyStr(doc.conceptId)) throw new Error('conceptId 필수');
  if (!Array.isArray(doc.problems) || doc.problems.length === 0) throw new Error('problems 비어있음');

  const problems: GeneratedLabProblem[] = [];
  const errors: { index: number; error: string }[] = [];

  doc.problems.forEach((p, i) => {
    try {
      if (!TYPES.includes(p.type)) throw new Error(`type 무효: ${String(p.type)}`);
      if (!Number.isInteger(p.difficulty) || p.difficulty < 1 || p.difficulty > 5)
        throw new Error(`difficulty 무효(1~5 정수): ${String(p.difficulty)}`);
      const raw: GeminiGenRaw = {
        body: p.body,
        choices: p.choices ?? undefined,
        answerIndex: p.answerIndex,
        answer: p.answer,
        rubric: p.rubric,
        explanation: p.explanation ?? '',
      };
      const g = normalizeGenerated(raw, p.type, p.difficulty);
      const diagram = validateDiagram(p.diagram); // 🚧 토대4: 도형 스펙 검증(있으면)
      problems.push({ ...g, source: doc.source, diagram }); // 교재 출처로 source 교체 + 도형 부착
    } catch (e) {
      errors.push({ index: i, error: e instanceof Error ? e.message : String(e) });
    }
  });

  return { source: doc.source, conceptId: doc.conceptId, problems, errors };
}
