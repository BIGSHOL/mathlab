'use client';

import { Badge } from '@/components/ui/Badge';

interface DeadlineBadgeProps {
  dueDate: string | null;
  status?: string;
}

export function DeadlineBadge({ dueDate, status }: DeadlineBadgeProps) {
  if (status === 'COMPLETED') {
    return <Badge variant="success">완료</Badge>;
  }

  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let label: string;
  let variant: 'info' | 'warning' | 'error' | 'default';

  if (diffDays < 0) {
    label = '마감';
    variant = 'error';
  } else if (diffDays === 0) {
    label = 'D-Day';
    variant = 'error';
  } else if (diffDays <= 3) {
    label = `D-${diffDays}`;
    variant = 'warning';
  } else {
    label = `D-${diffDays}`;
    variant = 'info';
  }

  return <Badge variant={variant}>{label}</Badge>;
}
