'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backHref?: string;
  actions?: React.ReactNode;
}

/**
 * 페이지 제목 표준 컴포넌트
 * - title: text-2xl font-bold
 * - subtitle: text-sm text-text-secondary
 * - icon: w-6 h-6 아이콘
 * - backHref: 뒤로가기 링크
 * - actions: 우측 액션 버튼
 */
export function PageHeader({ title, subtitle, icon, backHref, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="p-1.5 rounded-sm hover:bg-slate-100 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        {icon && <div className="text-primary">{icon}</div>}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
