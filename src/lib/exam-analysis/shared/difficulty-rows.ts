/**
 * 블로그 문항표(`v4_difficulty_rows`) — 프롬프트 입력과 최종 행을 **한 곳에서** 만든다.
 *
 * ## 왜 이 파일이 있나
 *
 * 문항표는 원래 AI가 **처음부터 다시 타이핑한 배열**이었다. 프롬프트는 이미
 * "번호·단원·Lv·배점은 그대로, analysis_short만 새로 작성"이라 지시했지만, 지키는지
 * 검사하는 코드가 없었다. 결과로 두 가지가 조용히 깨졌다.
 *
 * 1. **선생님 교정이 블로그에 반영되지 않는다.** 화면 표는 인라인 교정을 즉시 반영하는데,
 *    블로그 표는 총평을 재생성하기 전까지 옛 값을 내보낸다 → 우리 화면과 우리 블로그가
 *    같은 시험의 다른 배점을 말한다. (CLAUDE.md §12-4 의 재발)
 * 2. **문항이 통째로 빠져도 아무도 모른다.** 난이도가 '1'~'5' 가 아니면 조용히 '3' 으로
 *    강제되고, AI 가 몇 문항을 누락해도 그대로 나간다. (§12-11 과 같은 병증)
 *
 * 그래서 행 골격(번호·단원·난이도·배점)은 **`questions[]` 에서 결정론적으로 파생**하고,
 * AI 가 만든 것 중에는 문장(`analysis_short`)과 세부 개념(`sub_topic`)만 번호로 조인한다.
 * 이제 AI 가 표를 잘못 베껴도 숫자가 틀릴 수 없다.
 *
 * ## 프롬프트 입력도 여기서 만든다
 *
 * `formatQuestionLine()` 이 프롬프트에 들어가는 문항 한 줄을 만든다. V3·V4 가 각자
 * 템플릿 문자열을 갖고 있으면 반드시 갈라진다 — 실제로 V3 에만 레거시 난이도 변환이
 * 있고 V4 에는 없었다. 산출물과 그 산출물을 설명하는 입력을 한 곳에서 파생시킨다(§12-13).
 */

/** 문항표 한 행. `CommentaryResult['v4_difficulty_rows']` 의 원소 타입. */
export type DifficultyRow = {
  question_number: string | number;
  topic: string;
  sub_topic?: string;
  difficulty: '1' | '2' | '3' | '4' | '5';
  points: number;
  analysis_short?: string;
};

/** 행 파생에 필요한 문항 최소 형태 — `AnalyzedQuestion` 의 부분집합만 요구한다. */
export type RowSourceQuestion = {
  question_number: number | string;
  topic?: string | null;
  difficulty?: string | null;
  points?: number | null;
  question_format?: string | null;
  ai_comment?: string | null;
  difficulty_reason?: string | null;
};

const LEVELS = ['1', '2', '3', '4', '5'] as const;

/** 구 4단계 키 → 5단계. 오래된 분석본이 아직 concept/pattern/… 를 들고 있다. */
const LEGACY_LEVEL: Record<string, string> = {
  concept: '1',
  pattern: '2',
  reasoning: '4',
  creative: '5',
};

/** 난이도 값을 '1'~'5' 로 정규화. 판독 불가면 null — 임의로 '3' 을 만들지 않는다. */
export function normalizeLevel(raw: unknown): '1' | '2' | '3' | '4' | '5' | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const mapped = LEGACY_LEVEL[s] ?? s;
  return (LEVELS as readonly string[]).includes(mapped)
    ? (mapped as '1' | '2' | '3' | '4' | '5')
    : null;
}

/**
 * `"중3 수학 > 이차방정식 > 이차방정식의 활용"` → `"이차방정식의 활용"`.
 * 표준 단원명은 교차 집계의 기반이라 저장은 전체 경로로 하지만, 학부모가 읽는 표에는
 * 말단만 보여준다.
 */
export function leafTopic(topic?: string | null): string {
  const parts = String(topic ?? '')
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/** 번호 비교용 엄격 키 — `1` 과 `"1"`, `" 서술형2 "` 와 `"서술형2"` 를 같게 본다. */
function exactKey(n: unknown): string {
  return String(n ?? '').trim().replace(/\s+/g, '');
}

/**
 * 느슨한 키 — **서술형/서답형 표기 흔들림을 흡수한다.**
 *
 * 실데이터에 두 표기가 모두 있고(서답형 15건·서술형 24건), AI 는 같은 시험 안에서도
 * 문항표에 `"서답형7"`, 핵심문항에 `"서술형7"` 처럼 섞어 쓴다. 엄격 비교만 하면 조인이
 * 조용히 실패해 해설이 통째로 사라진다 — 표는 그대로 보이므로 아무도 눈치채지 못한다.
 *
 * 한글이 섞인 번호는 접두 표기를 버리고 `T + 숫자` 한 부류로 접는다.
 * (한 시험이 서술형과 서답형을 동시에 별개 계열로 쓰는 경우는 실데이터에 없다.)
 */
function looseKey(n: unknown): string {
  const s = exactKey(n);
  if (!/[가-힣]/.test(s)) return s;
  const digits = s.replace(/\D/g, '');
  return digits ? `T${digits}` : s;
}

/**
 * 프롬프트에 실리는 문항 한 줄.
 *
 * 예전에는 `${번호}번: ${단원} / Lv${n} / ${점}점` 세 값만 실었다. 시험지 이미지를 보고
 * 이미 뽑아 둔 `ai_comment`·`difficulty_reason` 을 버리고 숫자 세 개에서 해설을 지어내던 것을
 * 막기 위해, 근거를 함께 싣는다. (같은 파일의 1차 총평 프롬프트는 원래부터 ai_comment 를
 * 넣고 있었다 — 한 에이전트 안의 비대칭을 없앤다.)
 */
export function formatQuestionLine(q: RowSourceQuestion): string {
  const topic = q.topic || '미분류';
  const lv = normalizeLevel(q.difficulty) ?? '?';
  const pts = q.points ?? 0;
  const fmt = q.question_format === 'essay' ? ' [서술형]' : '';
  const comment = (q.ai_comment || '').trim();
  const reason = (q.difficulty_reason || '').trim();
  return (
    `${q.question_number}번: ${topic} / Lv${lv} / ${pts}점${fmt}`
    + (comment ? ` — ${comment}` : '')
    + (reason ? ` (난이도 근거: ${reason})` : '')
  );
}

/** 프롬프트용 문항 목록 전체. */
export function formatQuestionDetails(questions: readonly RowSourceQuestion[]): string {
  return questions.map(formatQuestionLine).join('\n');
}

/**
 * AI 가 만든 행과 `questions[]` 를 대조해 최종 문항표를 만든다.
 *
 * - **골격은 `questions[]`**: 번호·단원·난이도·배점. 선생님 교정이 그대로 반영되고,
 *   AI 가 문항을 빠뜨려도 행이 사라지지 않는다.
 * - **AI 에게서 가져오는 것은 문장뿐**: `analysis_short`, `sub_topic`.
 * - 순서도 `questions[]` 를 따른다.
 *
 * `questions` 가 비어 있으면 AI 행을 그대로 돌려준다 — 문항 정보 없이 호출되는 경로
 * (구버전 재파싱 등)에서 표가 통째로 사라지는 것보다 낫다.
 */
export function reconcileDifficultyRows(
  aiRows: readonly Partial<DifficultyRow>[] | undefined,
  questions: readonly RowSourceQuestion[] | undefined,
): DifficultyRow[] | undefined {
  const rows = Array.isArray(aiRows) ? aiRows : [];

  if (!questions || questions.length === 0) {
    if (!rows.length) return undefined;
    return rows.map((r) => ({
      question_number: r.question_number ?? '',
      topic: String(r.topic ?? ''),
      sub_topic: r.sub_topic ? String(r.sub_topic) : undefined,
      difficulty: normalizeLevel(r.difficulty) ?? '3',
      points: Number(r.points) || 0,
      analysis_short: r.analysis_short ? String(r.analysis_short) : undefined,
    }));
  }

  // 엄격 매칭 우선, 실패하면 표기 흔들림을 흡수한 느슨한 매칭으로 한 번 더.
  const exact = new Map<string, Partial<DifficultyRow>>();
  const loose = new Map<string, Partial<DifficultyRow>>();
  for (const r of rows) {
    const ek = exactKey(r.question_number);
    if (ek && !exact.has(ek)) exact.set(ek, r);
    const lk = looseKey(r.question_number);
    if (lk && !loose.has(lk)) loose.set(lk, r);
  }

  return questions.map((q) => {
    const ai = exact.get(exactKey(q.question_number)) ?? loose.get(looseKey(q.question_number));
    // 난이도: 문항이 기준. 문항이 판독 실패(null)면 AI 값으로 폴백하고, 그것도 없을 때만 '3'.
    // ('3' 은 마지막 수단 — 못 읽은 문항을 쉬운 문항으로 둔갑시키지 않기 위해 순서가 중요하다.)
    const difficulty = normalizeLevel(q.difficulty) ?? normalizeLevel(ai?.difficulty) ?? '3';
    const topic = leafTopic(q.topic) || String(ai?.topic ?? '') || '미분류';
    // `??` 로 이어야 배점 0점 문항이 AI 값으로 덮이지 않는다(`||` 는 0 을 빈 값으로 본다).
    const points = Number(q.points ?? ai?.points ?? 0) || 0;
    return {
      question_number: q.question_number,
      topic,
      sub_topic: ai?.sub_topic ? String(ai.sub_topic) : undefined,
      difficulty,
      points,
      analysis_short: ai?.analysis_short ? String(ai.analysis_short) : undefined,
    };
  });
}
