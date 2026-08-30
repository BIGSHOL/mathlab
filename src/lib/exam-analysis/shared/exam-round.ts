/**
 * 시험 회차(연도·학기·시험종류) 판정 — **단일 소스.**
 *
 * ## 왜 이 파일이 있나
 *
 * 업로드 시 `ExamPaper.examScope` 에 `{ examYear, examSemester, examCategory }` 를
 * 구조화해 저장해 두고도, 정작 비교 데이터를 모으는 쪽은 **제목 정규식**으로 회차를
 * 판정하고 있었다. 게다가 판정 로직이 여러 곳에 복제되면서 정규식마저 갈라졌다 —
 * 한쪽은 `/(20\d{2})년?/`("년" 선택), 다른 쪽은 `/(20\d{2})년/`("년" 필수).
 *
 * 결과: 화면 배지는 "비교 가능 11건"이라 말하는데 총평에는 아무 데이터도 안 들어가는
 * 불일치가 생길 수 있다. 지금은 title 이 정형이라 우연히 맞고 있는 **잠복 결함**이다.
 *
 * ## 설계 원칙
 *
 * 1. **구조화 메타 우선, 제목은 폴백.** 제목 폴백을 없애면 안 된다 — `examScope` 는
 *    나중에 도입됐고, 지금도 회차 메타 없이 생성되는 시험지가 있다(업로드 시 메타
 *    미입력이면 레거시 `string[]` 또는 `undefined` 로 저장된다).
 * 2. **축별 독립 폴백.** 연도만 알고 학기를 모를 수 있다. 한 축이 비었다고 나머지까지
 *    버리지 않는다.
 * 3. **모르면 `null`.** 기본값으로 채우지 않는다(§12-11). "2025년이라고 신고했다"와
 *    "몰라서 2025로 뒀다"를 섞으면 필터가 조용히 틀린다.
 * 4. **`examScope` 는 Prisma `Json?`** 이라 런타임에 무엇이든 온다(§11).
 *    신형 객체 / 레거시 `string[]`(topics 만) / `null` 세 형태가 실제로 혼재하므로
 *    `Array.isArray` 를 **먼저** 확인한다 — 배열에서 `raw.examYear` 는 `undefined` 라
 *    확인 없이 통과시키면 판정 불가가 "값 없음"으로 위장된다.
 */

/** 시험지에서 회차를 읽어낼 때 필요한 최소 형태. */
export type RoundSource = {
  title?: string | null;
  examScope?: unknown;
};

export type ExamRound = {
  /** "2025" — 모르면 null */
  year: string | null;
  /** "1" | "2" — 모르면 null */
  semester: string | null;
  /** 제목 표기와 같은 한글 ("중간" | "기말" | "모의") — 모르면 null */
  categoryKo: string | null;
};

/** `examCategory` enum → 제목에 쓰이는 한글 표기. */
const CATEGORY_KO: Record<string, string> = {
  MIDTERM: '중간',
  FINAL: '기말',
  MOCK: '모의',
};

/**
 * 연도 정규식은 **"년"을 선택**으로 둔다.
 * 두 복제본 중 관대한 쪽을 채택했다 — strict(`년` 필수) 쪽은 "2025 1학기 중간" 같은
 * 제목에서 연도를 통째로 놓쳤다. 매치가 늘기만 하므로 기존 매칭은 그대로 유지된다.
 */
const YEAR_RE = /(20\d{2})년?/;
/** "1학기 중간" / "2학기 기말" — 학기와 시험종류를 한 번에 잡는다. */
const SEM_TYPE_RE = /(\d)\s*학기\s*(중간|기말|모의)/;
/** 시험종류 없이 학기만 있는 제목("2025년 1학기 …")용 폴백. */
const SEM_ONLY_RE = /(\d)\s*학기/;

/** `examScope` 가 회차 메타를 담은 신형 객체일 때만 그 객체를 돌려준다. */
function scopeObject(raw: unknown): { examYear?: unknown; examSemester?: unknown; examCategory?: unknown } | null {
  // 레거시는 `string[]`(topics) — 배열을 먼저 걸러내지 않으면 아래 속성 접근이
  // 전부 undefined 로 조용히 통과한다.
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as { examYear?: unknown; examSemester?: unknown; examCategory?: unknown };
}

/** 숫자든 문자열이든 받아 문자열로. 빈 값·NaN 은 null. */
function toNumStr(v: unknown): string | null {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t && /^\d+$/.test(t) ? t : null;
  }
  return null;
}

/**
 * 시험지의 회차를 읽는다. **구조화 메타 우선, 제목 폴백, 축별 독립.**
 */
export function readExamRound(paper: RoundSource): ExamRound {
  const scope = scopeObject(paper.examScope);

  let year = scope ? toNumStr(scope.examYear) : null;
  let semester = scope ? toNumStr(scope.examSemester) : null;
  let categoryKo: string | null = null;
  if (scope && typeof scope.examCategory === 'string') {
    categoryKo = CATEGORY_KO[scope.examCategory.trim().toUpperCase()] ?? null;
  }

  const title = typeof paper.title === 'string' ? paper.title : '';
  if (title) {
    if (!year) {
      const m = title.match(YEAR_RE);
      if (m) year = m[1];
    }
    if (!semester || !categoryKo) {
      const m = title.match(SEM_TYPE_RE);
      if (m) {
        if (!semester) semester = m[1];
        if (!categoryKo) categoryKo = m[2];
      }
    }
    if (!semester) {
      const m = title.match(SEM_ONLY_RE);
      if (m) semester = m[1];
    }
  }

  return { year, semester, categoryKo };
}

/**
 * 두 회차가 같은가. **비교할 축을 호출부가 고른다.**
 *
 * 축을 고르게 하는 게 중요하다 — 연도 비교("작년 같은 시험")는 연도가 *달라야* 하고,
 * 동시기 비교("올해 옆 학교")는 연도가 *같아야* 한다. 정반대인 게 정상이다.
 *
 * 기준(`base`)에 값이 없는 축은 검사하지 않는다 — 우리가 모르는 것을 근거로
 * 후보를 떨어뜨리지 않는다.
 */
export function isSameRound(
  base: ExamRound,
  other: ExamRound,
  axes: { year?: boolean; semester?: boolean; category?: boolean },
): boolean {
  if (axes.year && base.year && other.year !== base.year) return false;
  if (axes.semester && base.semester && other.semester !== base.semester) return false;
  if (axes.category && base.categoryKo && other.categoryKo !== base.categoryKo) return false;
  return true;
}
