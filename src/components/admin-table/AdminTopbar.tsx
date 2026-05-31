import * as React from 'react';

export type AdminTopbarProps = {
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** 우측 액션 슬롯 (버튼 등) */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Pattern F — 어드민 테이블 상단 타이틀 + 메타 + 우측 액션.
 * 시안: data/refact2/pages/pattern-f-admin-table-hifi.html § V1 topbar
 */
export function AdminTopbar({ title, meta, actions, className }: AdminTopbarProps) {
  const classes = ['adm-topbar'];
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')}>
      <span className="title">{title}</span>
      {meta && <span className="meta">{meta}</span>}
      <div className="sp" />
      {actions}
    </div>
  );
}
