'use client';

import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface LoadingEmptyStateProps {
  loading: boolean;
  empty: boolean;
  icon?: React.ReactNode;
  message?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 로딩/빈 상태 래퍼 — 데이터 목록 페이지에서 공통 사용
 * loading=true → 스피너, empty=true → 빈 상태 카드, 그 외 → children
 */
export function LoadingEmptyState({
  loading,
  empty,
  icon,
  message,
  description,
  action,
  children,
}: LoadingEmptyStateProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (empty) {
    return (
      <Card className="p-12 text-center">
        {icon && <div className="mx-auto mb-3">{icon}</div>}
        {message && <p className="text-text-secondary mb-4">{message}</p>}
        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
        {action}
      </Card>
    );
  }

  return <>{children}</>;
}
