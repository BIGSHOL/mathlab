/**
 * V3 피처 박스 — 검정 배경 + Bodoni Moda 180px 거대 숫자
 *
 * 좌측: 헤드라인(title) + body 문단. body 굵게는 황색(.v3-feature p strong CSS override).
 * 우측: 거대 숫자 + unit + label.
 *
 * 시안: scripts/generate-v3-preview-html.ts::buildCommentaryHtml 의 featureSection JSX 버전
 */

import { markdownToHighlighted, renderTitleWithEmphasis } from './helpers';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';

export function FeatureCallout({ callout }: { callout: NonNullable<CommentaryResult['feature_callout']> }) {
  // body 가 string 일 가능성 가드 (엣지케이스 #3)
  const bodyArray = Array.isArray(callout.body) ? callout.body : callout.body ? [callout.body] : [];

  return (
    <section className="v3-feature">
      <div className="v3-feature-lhs">
        <h2>{renderTitleWithEmphasis(callout.title, 'fc-title')}</h2>
        {bodyArray.map((p, i) => (
          <p key={`fc-body-${i}`}>{markdownToHighlighted(p, `fc-body-${i}`)}</p>
        ))}
      </div>
      <div className="v3-feature-rhs">
        <div className="v3-big-num">
          {callout.big_number}
          {callout.big_number_unit && <span className="v3-big-num-of">{callout.big_number_unit}</span>}
        </div>
        <div className="v3-big-num-lb">{callout.big_number_label}</div>
      </div>
    </section>
  );
}
