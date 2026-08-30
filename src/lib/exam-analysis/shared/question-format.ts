/**
 * 문항 형식(객관식·단답형·서술형) 판정 — **여기 아니면 어디서도 하지 말 것.**
 *
 * ## 왜 단일 함수가 아니라 두 술어인가
 *
 * "서술형"이라는 말이 코드베이스에서 **두 가지 다른 뜻**으로 쓰이고 있었다.
 *
 *   - **풀이 과정을 채점하는 문항** (`essay`) — 부분점수·감점 기준·답안 작성 4단계의 대상
 *   - **직접 기입하는 문항** (`essay` + `short_answer`) — 찍어서 맞힐 수 없는 문항
 *
 * 둘 다 정당한 개념인데 이름이 하나뿐이라, 화면마다 다른 쪽을 골라 쓰면서
 * **[분석] 탭과 [학습 대책] 탭이 같은 시험의 다른 문항수·배점을 표시**했다.
 * 그래서 하나로 통일하지 않고 이름을 둘로 나눈다 — 호출부가 어느 뜻인지 고르게 만든다.
 *
 * ## 왜 정규화가 필요한가
 *
 * `question_format` 은 Prisma `Json` 에서 오므로 런타임에 타입이 없다(CLAUDE.md §11).
 * 실제로 들어오는 값은 셋 중 하나가 아닐 수 있다.
 *
 *   - `null` — 형식 필드가 없던 시절 데이터. 번호가 `"서답형3"` 인데 형식은 비어 있다.
 *   - `'Essay'` / `'주관식'` 같은 변형 — AI 가 가끔 이렇게 준다.
 *
 * 이걸 그냥 `=== 'essay'` 로 비교하면 조용히 빠진다. 3분할 집계에서는 어느 칸에도
 * 안 들어가 **합계가 문항 수보다 작아지고**, 표는 멀쩡해 보여서 아무도 눈치채지 못한다.
 * `resolveQuestionFormat` 은 반드시 세 값 중 하나를 돌려주므로 그런 누락이 생기지 않는다.
 */
import { EXAM_QUESTION_FORMATS, type ExamQuestionFormat } from './constants';

/** 판정에 필요한 문항 최소 형태 — `AnalyzedQuestion` 의 부분집합만 요구한다. */
export type FormatSourceQuestion = {
  question_format?: unknown;
  question_number?: unknown;
};

/** 형식 필드가 비었을 때 번호에서 서술형을 알아보는 표기들 (`서답형3`, `서술형 2`). */
const WRITTEN_NUMBER_RE = /서답|서술/;

/** AI 가 주는 변형 표기 → 표준 값. 소문자·공백 제거 후 비교한다. */
const FORMAT_ALIASES: Record<string, ExamQuestionFormat> = {
  essay: 'essay',
  서술형: 'essay',
  서답형: 'essay',
  논술형: 'essay',
  short_answer: 'short_answer',
  shortanswer: 'short_answer',
  단답형: 'short_answer',
  주관식: 'short_answer',
  objective: 'objective',
  multiple_choice: 'objective',
  multiplechoice: 'objective',
  객관식: 'objective',
  선택형: 'objective',
};

/**
 * 문항 형식을 **반드시 세 값 중 하나로** 정규화한다.
 *
 * 우선순위: ① 표준/변형 형식 값 → ② 형식이 비었을 때만 번호 문자열 추론 → ③ 객관식.
 * ②를 마지막이 아니라 형식 판정 실패 시에만 쓰는 게 중요하다 — 형식이 `'objective'` 인데
 * 번호가 `"서답형"` 계열인 데이터를 뒤집으면 안 된다.
 */
export function resolveQuestionFormat(q: FormatSourceQuestion): ExamQuestionFormat {
  const raw = String(q.question_format ?? '').trim();
  if (raw) {
    if ((EXAM_QUESTION_FORMATS as readonly string[]).includes(raw)) return raw as ExamQuestionFormat;
    const alias = FORMAT_ALIASES[raw.toLowerCase().replace(/[\s-]/g, '')];
    if (alias) return alias;
  }
  // 형식이 없던 시절 데이터 복구 — 번호에 서답/서술이 있으면 서술형으로 본다.
  if (WRITTEN_NUMBER_RE.test(String(q.question_number ?? ''))) return 'essay';
  return 'objective';
}

/**
 * **풀이 과정을 채점하는 문항인가.**
 *
 * 부분점수·감점 기준·"풀이 과정을 논리적으로 작성" 같은 문구의 대상이다.
 * 라벨이 "서술형"이고 문구가 풀이 과정을 말한다면 이쪽을 써라.
 */
export function isEssay(q: FormatSourceQuestion): boolean {
  return resolveQuestionFormat(q) === 'essay';
}

/**
 * **답을 직접 기입하는 문항인가** (서술형 + 단답형).
 *
 * 찍어서 맞힐 수 없다는 관점의 집계에 쓴다. 이 술어를 쓰는 화면은 라벨도
 * "서술형"이 아니라 "서술·단답형"이어야 한다 — 그러지 않으면 숫자가 어긋나 보인다.
 */
export function isWrittenResponse(q: FormatSourceQuestion): boolean {
  return resolveQuestionFormat(q) !== 'objective';
}

/**
 * 형식 3분할 집계. **합계가 항상 `questions.length` 와 같다** —
 * 손으로 세던 시절엔 변형 표기가 어느 칸에도 안 들어가 합계가 모자랐다.
 */
export function formatDistribution(questions: readonly FormatSourceQuestion[]): {
  objective: number;
  short_answer: number;
  essay: number;
} {
  const out = { objective: 0, short_answer: 0, essay: 0 };
  for (const q of questions) out[resolveQuestionFormat(q)] += 1;
  return out;
}

/** 형식별로 문항을 나눈다. 어떤 문항도 빠지지 않는다. */
export function groupByFormat<T extends FormatSourceQuestion>(
  questions: readonly T[],
): { objective: T[]; short_answer: T[]; essay: T[] } {
  const out: { objective: T[]; short_answer: T[]; essay: T[] } = {
    objective: [],
    short_answer: [],
    essay: [],
  };
  for (const q of questions) out[resolveQuestionFormat(q)].push(q);
  return out;
}

/** 사용자 노출 라벨 — 화면·프롬프트가 각자 맵을 들고 있지 않도록 한 곳에 둔다. */
export const FORMAT_LABELS: Record<ExamQuestionFormat, string> = {
  objective: '객관식',
  short_answer: '단답형',
  essay: '서술형',
};
