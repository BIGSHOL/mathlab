/**
 * 능력 영역별 배점 분해 — "이 시험은 어떤 힘을 물었나".
 *
 * ## 왜 있는가
 *
 * `ability_domain`(수학 계산력·이해력·문제해결력·추론력 / 영어 정확성·이해력·추론력·표현력)은
 * 시험지 분석 때 문항마다 만들어져 저장되는데, **학습 대책 탭에서 한 번도 쓰이지 않았다.**
 * 레이더 차트가 문항 수만 세어 보여줄 뿐, 배점이 어디 몰렸는지도 어느 문항인지도 알 수 없었다.
 *
 * 실측(2026-08-30, 분석본 22장·466문항): `ability_domain` 누락 **0%**,
 * 22장 전부 3종 이상 섞여 있다. 경명여중1은 문제해결력 45점 vs 추론력 8점 —
 * 어디에 배점이 몰렸는지가 시험마다 뚜렷이 다르다. 쓸 만한 신호다.
 *
 * ## 새로 만들지 않는다
 *
 * 축·라벨·색은 `getAbilityAxes(subject)`, 정규화는 `normalizeAbilityDomain` 을 그대로 쓴다.
 * 레이더 차트와 같은 함수를 써야 **같은 시험이 두 화면에서 다르게 보이지 않는다**(§12-4).
 * 퍼센트는 `integerPercents` — 합이 정확히 100 이라 막대와 합계가 어긋나지 않는다.
 *
 * ⚠️ 수학에서 `normalizeAbilityDomain` 은 **null 을 돌려주지 않는다**(못 읽으면 'calculation' 폴백).
 * 즉 수학에는 '미분류' 가 없고 계산력이 조금 과대평가될 수 있다. 차트가 이미 그렇게 세고 있어
 * 여기서 다르게 처리하면 두 화면이 갈라지므로 그대로 따른다. 현재 데이터에서는 폴백이 한 번도 안 걸린다.
 */

import type { AnalyzedQuestion } from '../types';
import { getAbilityAxes } from './chart-axes';
import { normalizeAbilityDomain } from './subject';
import { integerPercents, sumPoints } from './points';
import { collectQuestionEvidence, type QuestionEvidence } from './question-evidence';

export interface AbilityGroup {
  domain: string;
  label: string;
  color: string;
  questionCount: number;
  points: number;
  /** 합이 정확히 100 인 정수 퍼센트 (배점 기준) */
  percent: number;
  /** 이 능력 문항 중 AI 소견이 있는 것 — 없으면 빈 배열이고 화면은 목록을 숨긴다 */
  evidence: QuestionEvidence[];
}

export interface AbilityBreakdown {
  /** 문항이 있는 능력만, **배점 큰 순**. 배점이 어디 몰렸는지가 이 화면의 요지다. */
  groups: AbilityGroup[];
  /** 이 시험에 한 문항도 안 나온 능력 — "안 물었다" 도 정보다 */
  absent: Array<{ domain: string; label: string }>;
  totalPoints: number;
  totalQuestions: number;
}

const EMPTY: AbilityBreakdown = { groups: [], absent: [], totalPoints: 0, totalQuestions: 0 };

export function buildAbilityBreakdown(
  subject: string | null | undefined,
  questions: AnalyzedQuestion[],
): AbilityBreakdown {
  if (!questions.length) return EMPTY;

  const axes = getAbilityAxes(subject);
  const buckets = new Map<string, AnalyzedQuestion[]>();
  for (const q of questions) {
    const domain = normalizeAbilityDomain(subject, q.ability_domain, q.question_type);
    if (!domain) continue; // 영어에서만 발생 — 판정 불가를 임의의 축에 밀어 넣지 않는다
    const bucket = buckets.get(domain);
    if (bucket) bucket.push(q);
    else buckets.set(domain, [q]);
  }

  const present = axes.filter((a) => (buckets.get(a.key)?.length ?? 0) > 0);
  const absent = axes
    .filter((a) => !(buckets.get(a.key)?.length ?? 0))
    .map((a) => ({ domain: a.key, label: a.label }));

  // 퍼센트는 **정렬 전에** 축 순서 그대로 계산한 뒤 붙인다 — 정렬은 표시 순서일 뿐이다.
  const pointsByAxis = present.map((a) => sumPoints((buckets.get(a.key) ?? []).map((q) => q.points)));
  const percents = integerPercents(pointsByAxis);

  const groups: AbilityGroup[] = present.map((a, i) => {
    const qs = buckets.get(a.key) ?? [];
    return {
      domain: a.key,
      label: a.label,
      color: a.color,
      questionCount: qs.length,
      points: pointsByAxis[i],
      percent: percents[i],
      evidence: collectQuestionEvidence(qs),
    };
  });

  // 배점 같으면 문항 수 많은 쪽, 그것도 같으면 축 순서 유지(안정 정렬)
  groups.sort((a, b) => b.points - a.points || b.questionCount - a.questionCount);

  return {
    groups,
    absent,
    totalPoints: sumPoints(pointsByAxis),
    totalQuestions: groups.reduce((s, g) => s + g.questionCount, 0),
  };
}

/**
 * 배점이 한쪽에 몰렸는가 — 상위 1개가 전체의 40% 이상이면 그 능력을 돌려준다.
 *
 * 화면에 한 줄로 요약을 쓰기 위한 것이다. **정적 조언을 만들지 않으려고** 이렇게 한다 —
 * "계산 연습을 매일 하세요" 같은 문장은 어느 시험에서나 같지만, "이 시험은 배점의 45%가
 * 문제해결력에 몰려 있다" 는 이 시험에서만 나오는 사실이다.
 * 고르게 퍼져 있으면 null — 없는 쏠림을 만들어 내지 않는다.
 */
export function dominantAbility(b: AbilityBreakdown): AbilityGroup | null {
  const top = b.groups[0];
  if (!top || top.percent < 40) return null;
  return top;
}
