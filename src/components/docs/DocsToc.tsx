'use client';

import * as React from 'react';

export type DocsTocItem = {
  id: string;
  label: string;
  /** 좌측 아이콘 (emoji) */
  icon?: string;
  /** 우측 보조 텍스트 (예: 항목 수) */
  sub?: React.ReactNode;
};

export type DocsTocGroup = {
  title: string;
  items: DocsTocItem[];
};

export type DocsTocProps = {
  groups: DocsTocGroup[];
  activeId?: string;
  onSelect: (id: string) => void;
  className?: string;
};

/**
 * Pattern G V1 — 좌측 ToC.
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html § V1 docs-toc
 *
 * 카테고리 그룹별로 아이템 나열, active 아이템은 인디고 배경 강조.
 */
export function DocsToc({ groups, activeId, onSelect, className }: DocsTocProps) {
  const classes = ['docs-toc'];
  if (className) classes.push(className);

  return (
    <nav className={classes.join(' ')}>
      {groups.map((g) => (
        <div key={g.title} className="grp">
          <h5>{g.title}</h5>
          {g.items.map((it) => {
            const active = activeId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                className={`it${active ? ' on' : ''}`}
                onClick={() => onSelect(it.id)}
              >
                {it.icon && <span className="ic">{it.icon}</span>}
                <span>{it.label}</span>
                {it.sub != null && <span className="sub">{it.sub}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
