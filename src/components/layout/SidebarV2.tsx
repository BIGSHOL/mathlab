'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type SidebarV2NavItem = {
  icon: React.ReactNode; // emoji or icon
  label: string;
  href: string;
  badge?: number | string;
};

export type SidebarV2NavGroup = {
  title: string;
  items: SidebarV2NavItem[];
};

export type SidebarV2User = {
  name: string;
  /** 첫 글자가 아바타에 표시됨 */
  meta?: string;
  /** 아바타 background — CSS gradient or hex (기본 골드 그라데이션) */
  avatarBg?: string;
};

export type SidebarV2Props = {
  brand?: React.ReactNode; // 기본 'MathLAB'
  brandMark?: React.ReactNode; // 기본 'M'
  groups: SidebarV2NavGroup[];
  user?: SidebarV2User;
};

function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const ch = Array.from(trimmed)[0];
  return /^[a-zA-Z]$/.test(ch) ? ch.toUpperCase() : ch;
}

/**
 * v2 디자인 시스템 Sidebar (학생/선생님/관리자 공용).
 * mathlab-v2.css 의 .side .brand .nav-group .nav-item .me 매핑.
 *
 * - 현재 활성 경로는 usePathname() 으로 자동 감지.
 * - 학생/선생님/관리자 페이지마다 다른 NAV_GROUPS 상수를 import 해 props 로 전달.
 * - v1 `<Sidebar>` 와 별개 컴포넌트 — v1은 권한별 분기 자동, v2는 props 받아 렌더.
 */
export function SidebarV2({
  brand = 'MathLAB',
  brandMark = 'M',
  groups,
  user,
}: SidebarV2Props) {
  const pathname = usePathname() ?? '';

  return (
    <aside className="side">
      <div className="brand">
        <span className="mark">{brandMark}</span> {brand}
      </div>

      {groups.map((g) => (
        <React.Fragment key={g.title}>
          <div className="nav-group">{g.title}</div>
          {g.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? ' active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <span className="ic">{item.icon}</span>
                <span className="lb">{item.label}</span>
                {item.badge != null && <span className="badge">{item.badge}</span>}
              </Link>
            );
          })}
        </React.Fragment>
      ))}

      {user && (
        <div className="me">
          <div
            className="av"
            style={user.avatarBg ? { background: user.avatarBg } : undefined}
          >
            {initial(user.name)}
          </div>
          <div>
            <div className="name">{user.name}</div>
            {user.meta && <div className="meta">{user.meta}</div>}
          </div>
        </div>
      )}
    </aside>
  );
}
