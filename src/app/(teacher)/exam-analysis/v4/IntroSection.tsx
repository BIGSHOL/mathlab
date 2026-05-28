/**
 * V4 들어가며 — 시험 인상 전달 단락
 *
 * 갈수학학원 "▶ 들어가며" 스타일. 학부모/학생이 처음 읽었을 때 시험의 첫인상을
 * 직관적으로 전달. 2~3 문장 자유 단락.
 */

import { markdownToHighlighted } from './helpers';

interface IntroSectionProps {
  intro: string;
}

export function IntroSection({ intro }: IntroSectionProps) {
  if (!intro) return null;
  return (
    <div className="v4-intro-box">
      <p>{markdownToHighlighted(intro, 'v4-intro')}</p>
    </div>
  );
}
