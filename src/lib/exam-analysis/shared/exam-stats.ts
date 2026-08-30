/**
 * 학교가 공지한 실측 성적 지표 — 과목평균·응시자수·성취도 분포.
 *
 * ## 이 파일의 전제: **없는 게 정상이다**
 *
 * 우리가 만드는 다른 수치(난이도 가중평균, 변별력 지수)는 시험지만 있으면 항상 나온다.
 * 이건 다르다.
 *
 *   - 성적표는 시험 **2~4주 뒤**에 나온다 → "시험 직후 발행" 워크플로 밖이다.
 *   - 학교가 공지하지 않으면 알 방법이 **없다** — 추정하면 그 순간 거짓말이 된다.
 *   - 아는 축만 아는 게 흔하다(평균은 공지됐는데 성취도 분포는 없음).
 *
 * 그래서 설계 원칙이 셋이다.
 *
 * 1. **모든 축이 독립적으로 null 을 허용한다.** 하나만 알아도 저장되고 표시된다.
 * 2. **없으면 아무것도 렌더하지 않는다.** 빈 슬롯·"—"·"데이터 없음" 도 만들지 않는다.
 *    지면에 헤딩이 남아 있으면 사용자는 "분석이 빠졌다"고 읽고, AI 는 채우려 든다(§12-14).
 * 3. **AI 에는 값이 있을 때만 블록을 붙인다.** 프롬프트에 빈 헤딩을 넣으면 AI 가 지어낸다 —
 *    `buildNearbyComparisonBlock` 이 데이터 없을 때 블록 자체를 생략하는 것과 같은 이유.
 *
 * ## 출처 표기가 왜 필수인가
 *
 * 이 값은 우리가 계산한 게 아니라 **사람이 옮겨 적은 것**이다. 검증하지 않은 수치를
 * "학교 공식 지표"처럼 렌더하면 §12-5(검증 불가 수치 노출 금지)와 충돌한다.
 * 그래서 입력자·입력 시각·출처 메모를 값과 함께 보관하고, 화면에도 함께 보여준다.
 *
 * ⚠️ `ExamPaper.examStats` 는 Prisma `Json?` 이라 런타임에 무엇이든 온다(§11).
 *    반드시 `readExamStats()` 를 거칠 것 — 캐스팅 금지.
 */

/** 성취도 5단계 분포(%) — 축마다 독립적으로 null 가능. */
export type AchievementDistribution = {
  A: number | null;
  B: number | null;
  C: number | null;
  D: number | null;
  E: number | null;
};

export type ExamStats = {
  /** 과목평균 (0~100) */
  subjectAverage: number | null;
  /** 응시자 수 */
  examinees: number | null;
  /** 표준편차 */
  standardDeviation: number | null;
  /** 성취도 A~E 분포(%). 하나도 없으면 null */
  achievement: AchievementDistribution | null;
  /** 출처 메모 — "학교 공지", "성적표 캡처" 등 */
  source: string | null;
  /** 입력자 표시명 */
  enteredBy: string | null;
  /** 입력 시각 (ISO) */
  enteredAt: string | null;
};

export const EMPTY_EXAM_STATS: ExamStats = {
  subjectAverage: null,
  examinees: null,
  standardDeviation: null,
  achievement: null,
  source: null,
  enteredBy: null,
  enteredAt: null,
};

const GRADES = ['A', 'B', 'C', 'D', 'E'] as const;

/** 숫자로 읽되 범위를 벗어나거나 숫자가 아니면 null. 0 은 유효한 값이다. */
function num(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  // 소수 둘째 자리까지 — 학교 공지가 73.4 같은 형태다.
  return Math.round(n * 100) / 100;
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/**
 * `examStats` Json 을 읽는다. **어떤 입력이 와도 던지지 않고, 모르는 축은 null.**
 *
 * 배열·문자열·null 등 객체가 아닌 값은 전부 "정보 없음"으로 본다 — 레거시 포맷이
 * 생길 여지를 남겨 두되, 확인 없이 속성에 접근해 undefined 를 값으로 착각하지 않는다.
 */
export function readExamStats(raw: unknown): ExamStats {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_EXAM_STATS };
  const r = raw as Record<string, unknown>;

  let achievement: AchievementDistribution | null = null;
  const a = r.achievement;
  if (a && typeof a === 'object' && !Array.isArray(a)) {
    const ar = a as Record<string, unknown>;
    const parsed: AchievementDistribution = { A: null, B: null, C: null, D: null, E: null };
    let any = false;
    for (const g of GRADES) {
      const v = num(ar[g], 0, 100);
      parsed[g] = v;
      if (v !== null) any = true;
    }
    // 한 등급도 못 읽었으면 분포 자체가 없는 것으로 둔다(빈 껍데기를 만들지 않는다).
    achievement = any ? parsed : null;
  }

  return {
    subjectAverage: num(r.subjectAverage, 0, 100),
    examinees: num(r.examinees, 0, 100000),
    standardDeviation: num(r.standardDeviation, 0, 100),
    achievement,
    source: str(r.source, 60),
    enteredBy: str(r.enteredBy, 40),
    enteredAt: str(r.enteredAt, 40),
  };
}

/** 하나라도 실제 수치가 있는가. 출처·입력자만 있는 건 "값 없음"이다. */
export function hasAnyExamStats(s: ExamStats): boolean {
  return (
    s.subjectAverage !== null
    || s.examinees !== null
    || s.standardDeviation !== null
    || s.achievement !== null
  );
}

/** 성취도 분포에 값이 하나라도 있는가. */
export function hasAchievement(s: ExamStats): boolean {
  return !!s.achievement && GRADES.some((g) => s.achievement![g] !== null);
}

/**
 * 성취도 합계(%). 축이 비어 있으면 그 축은 빼고 더한다.
 * 학교 공지가 반올림돼 100 이 아닐 수 있으므로 **검증이 아니라 참고용**이다.
 */
export function achievementSum(s: ExamStats): number | null {
  if (!s.achievement) return null;
  const vals = GRADES.map((g) => s.achievement![g]).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) * 10) / 10;
}

/**
 * AI 프롬프트에 붙일 블록. **값이 없으면 `null` 을 돌려주고, 호출부는 블록을 아예 생략한다.**
 * 빈 헤딩을 남기면 AI 가 채우려 든다.
 */
export function examStatsPromptBlock(s: ExamStats): string | null {
  if (!hasAnyExamStats(s)) return null;
  const lines: string[] = ['\n\n## 학교 공지 실측 지표 (사람이 입력한 값 — 추정 금지)'];
  if (s.subjectAverage !== null) lines.push(`- 과목평균: ${s.subjectAverage}점`);
  if (s.examinees !== null) lines.push(`- 응시자 수: ${s.examinees}명`);
  if (s.standardDeviation !== null) lines.push(`- 표준편차: ${s.standardDeviation}`);
  if (hasAchievement(s)) {
    const parts = GRADES
      .filter((g) => s.achievement![g] !== null)
      .map((g) => `${g} ${s.achievement![g]}%`);
    lines.push(`- 성취도 분포: ${parts.join(' · ')}`);
  }
  lines.push('※ 위 값만 사실로 쓸 것. 여기 없는 지표(등급컷 등)는 추정하지 말고 언급하지 말 것.');
  return lines.join('\n');
}

/** 화면에 붙일 출처 문구. 입력 정보가 없으면 null. */
export function examStatsAttribution(s: ExamStats): string | null {
  const parts: string[] = [];
  if (s.source) parts.push(s.source);
  if (s.enteredBy) parts.push(`${s.enteredBy} 입력`);
  if (s.enteredAt) {
    const d = new Date(s.enteredAt);
    if (!Number.isNaN(d.getTime())) {
      parts.push(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`);
    }
  }
  return parts.length ? parts.join(' · ') : null;
}

/** 저장용 직렬화 — 값이 하나도 없으면 `null` 을 돌려 컬럼을 비운다(빈 객체를 남기지 않는다). */
export function toStoredExamStats(s: ExamStats): ExamStats | null {
  return hasAnyExamStats(s) ? s : null;
}
