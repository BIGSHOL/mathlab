import * as React from 'react';

export type DocsLayoutProps = {
  /** 좌측 ToC (240px) */
  toc: React.ReactNode;
  /** 우측 사이드 (200px) — 앵커 네비, 피드백 등. 생략 시 2열로 표시 */
  aside?: React.ReactNode;
  /** 중앙 본문 (.docs-body wrapper 는 페이지에서 직접 사용) */
  children: React.ReactNode;
  className?: string;
};

/**
 * Pattern G — 정적 문서 외곽 셸 (도움말 V1 모드).
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html § V1
 *
 * 구조:
 *   .docs-grid (240px ToC | 1fr body | 200px aside)
 *
 * 본문은 children 안에서 `<div className="docs-body">...</div>` 패턴.
 * 모바일 (≤ 900px): ToC + aside 숨김, body 1열.
 */
export function DocsLayout({ toc, aside, children, className }: DocsLayoutProps) {
  const classes = ['docs-grid'];
  if (className) classes.push(className);
  // aside 없으면 2열로 (240 | 1fr)
  const style = aside ? undefined : { gridTemplateColumns: '240px 1fr' };

  return (
    <div className={classes.join(' ')} style={style}>
      {toc}
      {children}
      {aside}
    </div>
  );
}
