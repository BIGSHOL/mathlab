/**
 * Pattern B V1 — 오답 목록.
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1 `.wrong-list`
 *
 * 각 카드: 문항번호 + 본문 미리보기(+ 토픽) + (내 답 → 정답).
 * 본문/답안은 ReactNode 로 받아서 MathRenderer 같은 외부 렌더링도 가능.
 */
import type { ReactNode } from 'react';

export interface WrongItem {
  /** 문항 표시 번호 (예: 7, "서답형3") */
  num: number | string;
  /** 문제 본문 (텍스트/JSX 둘 다 가능) */
  content: ReactNode;
  /** 단원/토픽 (예: "정수의 사칙연산 · 곱셈/덧셈 혼합") */
  topic?: string;
  /** 내가 쓴 답 */
  mine?: ReactNode;
  /** 실제 정답 */
  real?: ReactNode;
  /** 클릭 시 콜백 — 유사 문제 토글 등 */
  onClick?: () => void;
}

export interface WrongListProps {
  items: WrongItem[];
  emptyMessage?: string;
}

export function WrongList({ items, emptyMessage = '오답이 없습니다' }: WrongListProps) {
  if (items.length === 0) {
    return <div className="rr-empty">{emptyMessage}</div>;
  }
  return (
    <div className="rr-wrong-list">
      {items.map((it, i) => (
        <div
          key={i}
          className="rr-wrong-card"
          onClick={it.onClick}
          style={it.onClick ? { cursor: 'pointer' } : undefined}
        >
          <div className="qn">{it.num}</div>
          <div className="q">
            <span className="body">{it.content}</span>
            {it.topic && <div className="topic">{it.topic}</div>}
          </div>
          {(it.mine !== undefined || it.real !== undefined) && (
            <div className="ans">
              {it.mine !== undefined && <span className="my">{it.mine}</span>}
              {it.mine !== undefined && it.real !== undefined && <span className="arr">→</span>}
              {it.real !== undefined && <span className="real">{it.real}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
