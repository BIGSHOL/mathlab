/**
 * 총평 생성 사전 게이트 (readiness) — 클라이언트/서버 공유 단일 소스
 *
 * ⚠️ 이 파일이 존재하는 이유:
 * 같은 판정 로직이 AnalysisDetail(수동 버튼)과 page(분석 후 자동 체인) 양쪽에 복제돼 있었고,
 * 둘 다 `저장된 totalPoints`(= 문항 배점 합계)와 `문항 배점 합계`를 비교하는 **항등식**이라
 * "배점 합계 ≠ 만점이면 차단" 가드가 한 번도 발동하지 않았다.
 * (2026-07-25 경명여중1: 21문항 90점 — 마지막 10점 서술형 누락 — 인데도 총평 자동 생성됨)
 *
 * → 만점 기준은 반드시 **AI가 시험지에서 읽어낸 값**(summary.completeness.declaredPoints)을 쓴다.
 *   산출물에서 파생된 값끼리 비교하면 어떤 누락도 잡히지 않는다. CLAUDE.md §12-4 의 재발 사례.
 */

import { formatPoints, roundPoints, sumPoints } from './points';
import type { AnalysisCompleteness } from './types';

export interface ReadinessQuestion {
  points?: number | null;
  topic?: string | null;
}

export interface ReadinessResult {
  ready: boolean;
  /** 전체 차단 사유 (토스트·요약용) */
  reasons: string[];
  /**
   * 선생님이 문항 테이블에서 직접 고칠 수 있는 사유만 (배점·단원).
   * 누락 사유는 인라인 편집으로 해결되지 않으므로 제외 — 전용 배너가 재분석을 안내한다.
   */
  fixableReasons: string[];
  /** 누락/배점 불일치 사유 (전용 배너용). 정상이면 null */
  completenessReason: string | null;
  /** 누락 감지 결과 — 경고 배너 렌더에 사용. 구버전 분석본은 null */
  completeness: AnalysisCompleteness | null;
  expectedTotal: number;
  pointsSum: number;
}

/**
 * summary(Prisma `Json?`) 에서 completeness 안전 추출.
 * 구버전 분석본에는 없고, 형태도 보장되지 않으므로 진입부에서 정규화한다 (CLAUDE.md §11).
 */
export function readCompleteness(summary: unknown): AnalysisCompleteness | null {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
  const raw = (summary as Record<string, unknown>).completeness;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const o = raw as Record<string, unknown>;
  const status = o.status;
  if (status !== 'ok' && status !== 'incomplete' && status !== 'unverifiable') return null;

  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  return {
    status,
    declaredQuestions: numOrNull(o.declaredQuestions),
    declaredPoints: numOrNull(o.declaredPoints),
    emittedQuestions: num(o.emittedQuestions),
    pointsSum: num(o.pointsSum),
    pointsShortfall: num(o.pointsShortfall),
    filledQuestions: num(o.filledQuestions),
    retried: o.retried === true,
    reason: typeof o.reason === 'string' ? o.reason : '',
  };
}

/**
 * 총평 생성 가능 여부 판정.
 *
 * 차단 조건 (하나라도 걸리면 ready=false):
 *  1. 문항 누락 감지 (completeness.status === 'incomplete')
 *  2. 배점 합계 ≠ 만점
 *  3. 배점 미인식(null/0) 문항 존재
 *  4. 단원 미분류(UNKNOWN) 문항 존재
 */
export function checkAnalysisReadiness(input: {
  questions: ReadinessQuestion[];
  totalPoints?: number | null;
  summary?: unknown;
}): ReadinessResult {
  const { questions, totalPoints, summary } = input;
  const completeness = readCompleteness(summary);
  const pointsSum = sumPoints(questions.map((q) => q.points));

  if (!questions.length) {
    const reason = '분석 결과가 없습니다';
    return {
      ready: false, reasons: [reason], fixableReasons: [reason],
      completenessReason: null, completeness, expectedTotal: 0, pointsSum: 0,
    };
  }

  // 만점 기준: AI 신고값 우선. 없으면(구버전 분석본) 저장된 totalPoints → 100 순으로 폴백.
  // ⚠️ totalPoints 폴백은 합계와 같은 값이라 검증력이 없다 — 구버전 호환용일 뿐,
  //    새 분석본은 항상 declaredPoints 를 갖는다.
  const declaredPoints = completeness?.declaredPoints ?? null;
  const expectedTotal = declaredPoints !== null && declaredPoints > 0
    ? roundPoints(declaredPoints)
    : totalPoints && totalPoints > 0
      ? roundPoints(totalPoints)
      : 100;

  const fixableReasons: string[] = [];

  // ① 문항 누락 / 배점 불일치 — 인라인 편집이 아닌 재분석으로 해결 (전용 배너가 안내)
  let completenessReason: string | null = null;
  if (completeness?.status === 'incomplete') {
    // 배점 초과는 "누락"이 아니라 중복 판독 — 문구를 구분한다
    const isShortfall =
      completeness.pointsShortfall > 0 ||
      (completeness.declaredQuestions !== null && completeness.declaredQuestions > completeness.emittedQuestions);
    const label = isShortfall ? '문항 누락 감지' : '배점 불일치 감지';
    completenessReason = completeness.filledQuestions > 0
      ? `${label} — ${completeness.reason}. 임시 문항 ${completeness.filledQuestions}개를 추가했으니 시험지와 대조해 내용을 채우거나 재분석하세요`
      : `${label} — ${completeness.reason}`;
  }

  // ② 배점 합계 검증 (소수 배점 부동소수점 오차 제거 — sumPoints/roundPoints 필수)
  if (pointsSum !== expectedTotal) {
    const diff = roundPoints(pointsSum - expectedTotal);
    fixableReasons.push(`배점 합계 ${formatPoints(pointsSum)}점 (만점 ${formatPoints(expectedTotal)}점에서 ${diff > 0 ? '+' : ''}${formatPoints(diff)}점 차이)`);
  }

  // ③ 미인식 배점 (null/0)
  const missingPoints = questions.filter((q) => q.points === null || q.points === undefined || q.points === 0).length;
  if (missingPoints > 0) {
    fixableReasons.push(`${missingPoints}개 문항의 배점이 미인식 상태`);
  }

  // ④ 단원 UNKNOWN
  const unknownTopics = questions.filter((q) => {
    const t = (q.topic || '').trim();
    return !t || /UNKNOWN|미정|unknown/i.test(t);
  }).length;
  if (unknownTopics > 0) {
    fixableReasons.push(`${unknownTopics}개 문항의 단원이 미분류 상태`);
  }

  const reasons = completenessReason ? [completenessReason, ...fixableReasons] : fixableReasons;
  return { ready: reasons.length === 0, reasons, fixableReasons, completenessReason, completeness, expectedTotal, pointsSum };
}
