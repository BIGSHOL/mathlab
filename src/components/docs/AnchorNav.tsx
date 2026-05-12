'use client';

import * as React from 'react';

export type AnchorNavItem = {
  id: string;
  label: string;
  /** 0/1 — 1이면 들여쓰기 (서브 앵커) */
  level?: 0 | 1;
};

export type AnchorNavFeedback = {
  title: React.ReactNode;
  description?: React.ReactNode;
  ctaLabel: React.ReactNode;
  ctaHref?: string;
  ctaOnClick?: () => void;
};

export type AnchorNavProps = {
  anchors: AnchorNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** 우측 하단 피드백 카드 (선택) */
  feedback?: AnchorNavFeedback;
  className?: string;
};

/**
 * Pattern G V1 — 우측 앵커 네비 + 피드백.
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html § V1 docs-aside
 *
 * "이 문서 안에서" + 앵커 리스트 (active 인디고 강조) + "도움이 더 필요하세요?" 피드백.
 */
export function AnchorNav({
  anchors,
  activeId,
  onSelect,
  feedback,
  className,
}: AnchorNavProps) {
  const classes = ['docs-aside'];
  if (className) classes.push(className);

  return (
    <aside className={classes.join(' ')}>
      <h6>이 문서 안에서</h6>
      <div className="anchor-list">
        {anchors.map((a) => {
          const active = activeId === a.id;
          const style: React.CSSProperties =
            a.level === 1 ? { paddingLeft: 12, fontSize: 11 } : {};
          if (onSelect) {
            return (
              <button
                key={a.id}
                type="button"
                className={`a${active ? ' on' : ''}`}
                onClick={() => onSelect(a.id)}
                style={style}
              >
                {a.level === 1 ? `— ${a.label}` : a.label}
              </button>
            );
          }
          return (
            <a
              key={a.id}
              href={`#${a.id}`}
              className={`a${active ? ' on' : ''}`}
              style={{ textDecoration: 'none', ...style }}
            >
              {a.level === 1 ? `— ${a.label}` : a.label}
            </a>
          );
        })}
      </div>

      {feedback && (
        <>
          <h6>도움이 더 필요하세요?</h6>
          <div className="feedback">
            <b>{feedback.title}</b>
            {feedback.description}
            {feedback.ctaHref ? (
              <a className="btn-mini" href={feedback.ctaHref}>
                {feedback.ctaLabel}
              </a>
            ) : (
              <button
                type="button"
                className="btn-mini"
                onClick={feedback.ctaOnClick}
              >
                {feedback.ctaLabel}
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
