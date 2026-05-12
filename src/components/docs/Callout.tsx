import * as React from 'react';

export type CalloutType = 'default' | 'warn' | 'success';

export type CalloutProps = {
  type?: CalloutType;
  /** 헤더 (예: "💡 핵심 한 줄", "⚠️ 주의", "✅ 팁") */
  head?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Pattern G V1 — Callout 박스.
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html § V1 callout
 *
 * 좌측 4px primary/warn/success 컬러 보더 + 연한 배경.
 */
export function Callout({ type = 'default', head, children, className }: CalloutProps) {
  const classes = ['docs-callout'];
  if (type !== 'default') classes.push(type);
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      {head && <div className="head">{head}</div>}
      {typeof children === 'string' || typeof children === 'number' ? (
        <p>{children}</p>
      ) : (
        children
      )}
    </div>
  );
}
