'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Zap, Plus, Wrench, Bug } from 'lucide-react';
import type { UpdateLog, UpdateType } from '@/lib/data/updates';

const ICON_MAP: Record<UpdateType, typeof Zap> = {
  feature: Zap,
  add: Plus,
  fix: Bug,
  improve: Wrench,
};

const COLOR_MAP: Record<UpdateType, string> = {
  feature: 'bg-blue-100 text-blue-700',
  add: 'bg-green-100 text-green-700',
  fix: 'bg-amber-100 text-amber-700',
  improve: 'bg-violet-100 text-violet-700',
};

const LABEL_MAP: Record<UpdateType, string> = {
  feature: '기능',
  add: '추가',
  fix: '수정',
  improve: '개선',
};

interface Props {
  updates: UpdateLog[];
}

export function UpdateTimeline({ updates }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number>(0);

  if (updates.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary text-sm">
        표시할 업데이트가 없습니다.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200" />
      <div className="flex flex-col gap-4">
        {updates.map((log, idx) => {
          const isExpanded = expandedIdx === idx;
          return (
            <div key={`${log.date}-${idx}`} className="relative pl-12">
              <div
                className={`absolute left-[14px] top-3.5 w-3 h-3 rounded-full border-2 ${
                  idx === 0 ? 'bg-primary border-primary' : 'bg-white border-slate-300'
                }`}
              />
              <button
                onClick={() => setExpandedIdx(isExpanded ? -1 : idx)}
                className="w-full text-left bg-white rounded-sm border border-slate-200 hover:border-slate-300 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono text-text-secondary">{log.date}</span>
                    <h3 className="text-sm font-semibold text-text-primary mt-0.5 truncate">
                      {log.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-xs text-text-secondary">{log.entries.length}건</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="mt-1 bg-white rounded-sm border border-slate-200 shadow-sm px-5 py-3">
                  <ul className="flex flex-col gap-2">
                    {log.entries.map((entry, i) => {
                      const Icon = ICON_MAP[entry.type];
                      return (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold shrink-0 mt-0.5 ${COLOR_MAP[entry.type]}`}
                          >
                            <Icon className="w-3 h-3" />
                            {LABEL_MAP[entry.type]}
                          </span>
                          <span className="text-text-primary">{entry.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
