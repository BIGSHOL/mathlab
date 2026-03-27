'use client';

const STATUS_MAP = {
  PENDING: { label: '대기 중', className: 'bg-slate-100 text-slate-700' },
  ANALYZING: { label: '분석 중', className: 'bg-blue-100 text-blue-700 animate-pulse' },
  COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700' },
  FAILED: { label: '실패', className: 'bg-red-100 text-red-700' },
} as const;

interface StatusBadgeProps {
  status: keyof typeof STATUS_MAP;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || STATUS_MAP.PENDING;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
