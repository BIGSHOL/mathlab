'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Download, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const PERIOD_OPTIONS = [
  { key: '7d', label: '최근 7일' },
  { key: '30d', label: '최근 30일' },
  { key: '90d', label: '최근 3개월' },
  { key: 'all', label: '전체' },
] as const;

type PeriodKey = (typeof PERIOD_OPTIONS)[number]['key'];

export function OverviewActions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get('period') as PeriodKey) || '7d';
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (key: PeriodKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === '7d') {
      params.delete('period');
    } else {
      params.set('period', key);
    }
    const qs = params.toString();
    router.push(`/overview${qs ? `?${qs}` : ''}`);
    setOpen(false);
  };

  const currentLabel = PERIOD_OPTIONS.find((o) => o.key === current)?.label ?? '최근 7일';

  return (
    <div className="flex gap-2 print:hidden">
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center rounded-sm bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-slate-50 transition-all shadow-sm"
        >
          <Calendar className="w-4 h-4 mr-1.5" />
          {currentLabel}
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-sm shadow-lg z-50 py-1 animate-fade-in">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleSelect(opt.key)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  current === opt.key ? 'text-primary font-bold' : 'text-text-secondary'
                }`}
              >
                {opt.label}
                {current === opt.key && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => window.print()}
        className="flex items-center rounded-sm bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-all shadow-md"
      >
        <Download className="w-4 h-4 mr-1.5" />
        리포트 다운로드
      </button>
    </div>
  );
}
