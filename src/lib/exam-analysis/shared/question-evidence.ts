/**
 * 문항 근거(evidence) — AI 가 이 시험지를 **직접 보고** 쓴 문항별 소견을 추려낸다.
 *
 * ## 왜 필요한가
 *
 * 학습 대책 탭의 조언은 전부 정적 카탈로그에서 온다
 * (`study-strategy/constants.ts` 의 TYPE_STRATEGIES, `curriculum-strategies` 의 단원별 전략).
 * 그 문장들은 전국 어느 시험에서도 똑같이 나오므로, 읽는 사람은 "그래서 **이 시험**은?" 을 알 수 없다.
 *
 * 그런데 같은 분석 결과 안에 이미 시험별 근거가 들어 있다 — 문항마다 `ai_comment`(한 줄 소견)와
 * `difficulty_reason`(그 난이도를 준 이유)이 붙어 있다. 지금까지 이 값들은 문항표에서만 쓰이고
 * 대책 탭에서는 버려졌다. 이 모듈은 그것을 조언 옆에 놓을 수 있는 형태로 정리한다.
 *
 * ## 없을 때가 기본이다
 *
 * 옛 분석본, 저신뢰 문항, placeholder 문항은 두 필드가 모두 비어 있다. 그래서
 * **근거가 하나도 없는 문항은 아예 만들지 않는다**(`null` 반환). 번호와 배점만 있는 빈 줄을
 * 만들어 두면 화면에는 뭔가 있는 것처럼 보이지만 읽을 내용이 없다.
 * 호출부는 빈 배열을 받으면 블록을 통째로 숨겨야 한다 — 빈 헤딩을 남기지 말 것.
 */

import type { AnalyzedQuestion } from '../types';
import { isEssay } from './question-format';

export interface QuestionEvidence {
  /**
   * 표시용 문항 번호 — **원본 문자열을 그대로 보존한다.**
   * 실제 데이터에 "서답형1" / "서술형2" 같은 값이 있어서, 숫자로 바꾸면 시험지와 어긋난다.
   */
  number: string;
  /** "1"~"5" 또는 null(판독 실패). null 을 기본값으로 채우지 않는다(§12-11). */
  difficulty: string | null;
  points: number | null;
  isEssay: boolean;
  /** AI 가 이 문항을 보고 쓴 한 줄 소견 */
  comment: string | null;
  /** AI 가 그 난이도를 준 이유 */
  reason: string | null;
}

/** 공백뿐인 문자열은 없는 것으로 친다. */
function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

/**
 * 문항 하나 → 근거. **읽을 내용이 하나도 없으면 null.**
 * placeholder 문항(자동 분석 실패)의 `⚠️` 로 시작하는 안내문은 근거가 아니므로 제외한다 —
 * 그 문구는 문항표에서 경고로 이미 보여 주고 있고, 대책 옆에 놓으면 조언처럼 읽힌다.
 */
export function toQuestionEvidence(q: AnalyzedQuestion): QuestionEvidence | null {
  const rawComment = clean(q.ai_comment);
  const comment = rawComment && rawComment.startsWith('⚠️') ? null : rawComment;
  const reason = clean(q.difficulty_reason);
  if (!comment && !reason) return null;

  const points = typeof q.points === 'number' && Number.isFinite(q.points) ? q.points : null;

  return {
    number: String(q.question_number),
    difficulty: clean(q.difficulty),
    points,
    isEssay: isEssay(q),
    comment,
    reason,
  };
}

/**
 * 문항 배열 → 근거 목록. 근거 없는 문항은 빠지므로 **입력보다 짧을 수 있고 빈 배열일 수도 있다.**
 *
 * 정렬은 배점 큰 순 → 난이도 높은 순 → 원래 순서. 상위 몇 개만 잘라 보여줄 때
 * 무엇이 남을지 예측 가능하게 하기 위해서다(잘라도 가장 무거운 문항은 살아남는다).
 */
export function collectQuestionEvidence(questions: AnalyzedQuestion[]): QuestionEvidence[] {
  const out: Array<{ ev: QuestionEvidence; i: number }> = [];
  questions.forEach((q, i) => {
    const ev = toQuestionEvidence(q);
    if (ev) out.push({ ev, i });
  });

  return out
    .sort((a, b) => {
      const pd = (b.ev.points ?? 0) - (a.ev.points ?? 0);
      if (pd !== 0) return pd;
      const dd = Number(b.ev.difficulty ?? 0) - Number(a.ev.difficulty ?? 0);
      if (dd !== 0) return dd;
      return a.i - b.i;
    })
    .map((x) => x.ev);
}
