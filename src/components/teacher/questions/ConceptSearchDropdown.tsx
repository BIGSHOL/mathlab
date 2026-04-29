'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type { ConceptOption } from './question-types';

// --- bookCode → conceptCode 학제/학년 접두사 추출 ---
function getConceptPrefix(bookCode: string): string {
  // Elementary: E3-1 → E3, Middle: 1-1 → M1, High: H1-0 → H1, HA-0 → HA
  if (bookCode.startsWith('E')) return bookCode.split('-')[0]; // E3, E4, ...
  if (bookCode.startsWith('H')) return bookCode.split('-')[0]; // H1, H2, HA, HC1, ...
  // Middle: 1-1 → M1, 2-2 → M2
  const m = bookCode.match(/^(\d)/);
  return m ? `M${m[1]}` : '';
}

function getSchoolLabel(prefix: string): string {
  if (prefix.startsWith('E')) return `초${prefix.slice(1)}`;
  if (prefix.startsWith('M')) return `중${prefix.slice(1)}`;
  if (prefix.startsWith('H')) {
    const g = prefix.slice(1);
    if (g === 'A') return '대수';
    if (g === 'C1') return '미적1';
    if (g === 'C2') return '미적2';
    if (g === 'P') return '확통';
    if (g === 'G') return '기하';
    return `고${g}`;
  }
  return prefix;
}

/** 연결 개념 검색 드롭다운 */
export function ConceptSearchDropdown({
  concepts,
  value,
  onChange,
  bookCode,
}: {
  concepts: ConceptOption[];
  value: string;
  onChange: (id: string) => void;
  bookCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'match' | 'all'>('match');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prefix = useMemo(() => getConceptPrefix(bookCode), [bookCode]);
  const selected = concepts.find((c) => c.id === value);

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    let list = concepts;
    // 학제/학년 필터
    if (filterMode === 'match' && prefix) {
      list = list.filter((c) => c.conceptCode.startsWith(prefix));
    }
    // 검색어 필터
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.conceptCode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [concepts, filterMode, prefix, search]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm text-left flex items-center justify-between hover:border-slate-300 transition-colors"
      >
        <span className={selected ? 'text-text-primary' : 'text-slate-400'}>
          {selected ? `[${selected.conceptCode}] ${selected.title}` : '미지정'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-sm shadow-lg max-h-64 flex flex-col">
          {/* 검색 + 필터 */}
          <div className="p-2 border-b border-slate-100 space-y-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="개념 코드 또는 제목 검색..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-sm focus:ring-1 focus:ring-primary/40 focus:border-primary"
              />
            </div>
            {prefix && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setFilterMode('match')}
                  className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${
                    filterMode === 'match'
                      ? 'bg-primary text-white font-bold'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {getSchoolLabel(prefix)}만
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${
                    filterMode === 'all'
                      ? 'bg-primary text-white font-bold'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  전체
                </button>
              </div>
            )}
          </div>

          {/* 목록 */}
          <div className="overflow-y-auto flex-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${!value ? 'bg-primary/5 font-bold text-primary' : 'text-slate-500'}`}
            >
              미지정
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">검색 결과 없음</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${
                    c.id === value ? 'bg-primary/5 font-bold text-primary' : 'text-text-primary'
                  }`}
                >
                  <span className="text-slate-400 mr-1">[{c.conceptCode}]</span>
                  {c.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
