import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: ReactNode;
  iconBg?: string;
  label: string;
  value: string | number;
  suffix?: string;
  trend?: { value: string; positive: boolean };
  subtext?: string;
  children?: ReactNode;
}

export function StatCard({
  icon,
  iconBg = 'bg-blue-50',
  label,
  value,
  suffix,
  trend,
  subtext,
  children,
}: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-sm p-6 bg-white shadow-soft border border-slate-100 relative overflow-hidden group hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-3 ${iconBg} rounded-sm group-hover:scale-110 transition-transform duration-300`}>{icon}</div>
        {trend && (
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-sm flex items-center gap-1 ${
              trend.positive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {trend.positive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-text-secondary text-sm font-medium">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-text-primary tracking-tight text-3xl font-bold">{value}</p>
        {suffix && <p className="text-slate-400 text-lg font-medium pb-1">{suffix}</p>}
      </div>
      {subtext && <p className="text-slate-400 text-xs mt-1">{subtext}</p>}
      {children}
    </div>
  );
}
