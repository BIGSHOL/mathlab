'use client';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md';
}

export function ProgressBar({
  value,
  max = 100,
  color = 'bg-primary',
  label,
  showPercentage = false,
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  const height = size === 'sm' ? 'h-1.5' : 'h-3';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-text-secondary font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-xs text-text-secondary font-medium">{percentage}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full ${height}`}>
        <div
          className={`${color} ${height} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
