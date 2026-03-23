'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCommandsForRole } from '@/lib/constants/navigation';
import type { UserRole } from '@/types';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  const role = (user?.role ?? 'TEACHER') as UserRole;

  const allCommands = useMemo(() => {
    return getCommandsForRole(role);
  }, [role]);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    return allCommands.reduce<string[]>((acc, cmd) => {
      if (!seen.has(cmd.group)) { seen.add(cmd.group); acc.push(cmd.group); }
      return acc;
    }, []);
  }, [allCommands]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q))
    );
  }, [query, allCommands]);

  // Ctrl+K / Cmd+K 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 열릴 때 input 포커스 + 초기화
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // 선택 인덱스 범위 보정
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      e.preventDefault();
      navigate(filtered[selectedIdx].href);
    }
  };

  // 선택된 항목 스크롤 추적
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIdx] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  // 그룹별 렌더링
  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* 팔레트 */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="페이지 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-500 border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* 결과 목록 */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              검색 결과가 없습니다
            </p>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((cmd) => cmd.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {group}
                  </p>
                  {items.map((cmd) => {
                    const idx = globalIdx++;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => navigate(cmd.href)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          idx === selectedIdx
                            ? 'bg-primary/8 text-primary'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 opacity-60" />
                        <span className="font-medium">{cmd.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* 하단 힌트 */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">↑↓</kbd>
            이동
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">Enter</kbd>
            열기
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">Esc</kbd>
            닫기
          </span>
        </div>
      </div>
    </div>
  );
}
