/**
 * Pattern B V1 — AI 코멘트 박스 (사이드 패널용).
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1 `.ai-box`
 *
 * 단순 텍스트 또는 JSX 받음 — 외부에서 MathRenderer 사용 가능.
 */
import type { ReactNode } from 'react';

export interface AICommentaryProps {
  /** 본문 — string 또는 JSX (b 태그로 강조 가능) */
  children: ReactNode;
  /** 상단 태그 라벨. default: "🤖 AI 코멘트" */
  tag?: string;
}

export function AICommentary({ children, tag = '🤖 AI 코멘트' }: AICommentaryProps) {
  return (
    <div className="rr-ai-box">
      <div className="ai-tag">{tag}</div>
      <p>{children}</p>
    </div>
  );
}
