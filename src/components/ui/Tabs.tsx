'use client';

import type { LucideIcon } from 'lucide-react';

interface TabItem<K extends string = string> {
  key: K;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsProps<K extends string = string> {
  items: TabItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
  /** pill: 배경색 알약형 (기본), underline: 하단 밑줄형 */
  variant?: 'pill' | 'underline';
}

/**
 * 공통 탭 컴포넌트
 * - pill: 선택 시 bg-primary 알약 버튼 (숙제, 시험 등 상단 탭)
 * - underline: 선택 시 하단 파란 밑줄 (설정 사이드 등)
 */
export function Tabs<K extends string = string>({
  items,
  activeKey,
  onChange,
  variant = 'pill',
}: TabsProps<K>) {
  if (variant === 'underline') {
    return (
      <div className="flex border-b border-slate-200">
        {items.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-300'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // pill (기본)
  return (
    <div className="flex items-center gap-1">
      {items.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:bg-slate-100'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
