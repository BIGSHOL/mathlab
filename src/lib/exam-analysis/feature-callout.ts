// V3 feature_callout(거대 숫자 박스) 신뢰성 정규화.
//   V3 총평에서 헤더 다음 "가장 먼저 보이는 강조"라 신뢰성이 핵심.
//   문제: 표본이 작을 때(예: 킬러 2문항 중 2문항) "100%"처럼 극단 확정 비율을 거대 숫자로 박으면
//         "이 단원만 위험"이라는 단정·과장으로 읽혀 첫인상 신뢰를 깎는다 (사용자 보고 2026-06-24).
//   해결: 100%/0% 같은 극단 확정 비율이면 → label에 있는 절대수(예 "2문항")로 치환(거대 숫자 강조는 유지).
//         절대수를 못 찾으면 그 박스를 숨긴다(부정확한 100% 노출 방지).
//   ⚠️ 렌더 2곳(V3CommentaryView · naver-v3-renderer)이 공유 — 한쪽만 고치면 화면↔복사 불일치.
import type { CommentaryResult } from './agents/commentary-agent';

type FeatureCallout = NonNullable<CommentaryResult['feature_callout']>;

/**
 * feature_callout을 신뢰성 기준으로 정규화한다.
 * - 정상값(절대수·중간 비율): 그대로 반환.
 * - 극단 확정 비율(% 단위 & 100 이상 또는 0 이하): label의 양수 절대수(N문항/개)로 거대 숫자 치환.
 * - 치환할 절대수가 없으면 null(렌더 측에서 박스 숨김).
 */
export function normalizeFeatureCallout(fc: FeatureCallout): FeatureCallout | null {
  const unit = String(fc.big_number_unit ?? '');
  const num = parseFloat(String(fc.big_number ?? '').replace(/[^\d.-]/g, ''));
  const isExtremeRatio = unit.includes('%') && Number.isFinite(num) && (num >= 100 || num <= 0);
  if (!isExtremeRatio) return fc; // 정상 — 그대로

  // 극단 확정 비율 → label에서 양수 절대수(문항/개/문제) 추출해 거대 숫자 치환
  const label = String(fc.big_number_label ?? '');
  const m = label.match(/(\d+)\s*(문항|개|문제)/);
  if (m && Number(m[1]) > 0) {
    return { ...fc, big_number: m[1], big_number_unit: m[2] === '문제' ? '문항' : m[2] };
  }
  // 절대수 없음 → 단정적·검증 불가한 박스를 숨김
  return null;
}
