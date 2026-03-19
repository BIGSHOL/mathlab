'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  Users,
  BookOpen,
  Database,
  ClipboardCheck,
  CalendarCheck,
  Calculator,
  BarChart3,
  ToggleRight,
  Shield,
  Trophy,
  Award,
  FileText,
  Zap,
  PenTool,
} from 'lucide-react';
import { LogoIcon } from '@/components/ui/LogoIcon';
import type { HelpCategory, HelpItem } from '@/lib/data/help';

/* ── lucide 아이콘 매핑 ── */
const ICON_MAP: Record<string, typeof HelpCircle> = {
  Rocket,
  Users,
  BookOpen,
  Database,
  ClipboardCheck,
  CalendarCheck,
  Calculator,
  BarChart3,
  ToggleRight,
  Shield,
  Trophy,
  Award,
  FileText,
  Zap,
  PenTool,
};

interface Props {
  backHref: string;
  backLabel: string;
  isLoggedIn: boolean;
  /** teacher 레이아웃 안에 임베드될 때 true — 자체 헤더/푸터 숨김 */
  embedded?: boolean;
}

export function HelpContent({ backHref, backLabel, isLoggedIn, embedded }: Props) {
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/help')
      .then((r) => r.json())
      .then((res) => {
        const cats: HelpCategory[] = res.data ?? [];
        setCategories(cats);
        if (cats.length > 0) setSelectedCategoryId(cats[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── 검색 결과 ── */
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const results: { categoryLabel: string; item: HelpItem }[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        if (
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.toLowerCase().includes(q))
        ) {
          results.push({ categoryLabel: cat.label, item });
        }
      }
    }
    return results;
  }, [searchQuery, categories]);

  /* ── 선택된 카테고리 ── */
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  /* ── 렌더 ── */
  return (
    <div className={embedded ? 'flex-1 flex flex-col bg-white' : 'min-h-screen flex flex-col bg-white'}>
      {/* 헤더 (임베드 모드에서는 숨김) */}
      {!embedded && (
        <header className="flex items-center justify-between border-b border-slate-200 px-6 md:px-10 py-3 bg-white sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <LogoIcon className="w-6 h-6" />
            <Link href={backHref} className="text-lg font-bold tracking-tight text-text-primary">
              MathLab
            </Link>
          </div>
          <Link
            href={backHref}
            className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        </header>
      )}

      {/* 본문 */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
          불러오는 중...
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* ─── 좌측: 카테고리 목록 ─── */}
          <aside
            className={`shrink-0 border-r border-slate-200 bg-slate-50/60 flex flex-col transition-all duration-200 ${
              leftCollapsed ? 'w-12' : 'w-56'
            }`}
          >
            {/* 패널 헤더 */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200">
              {!leftCollapsed && (
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  카테고리
                </span>
              )}
              <button
                onClick={() => setLeftCollapsed(!leftCollapsed)}
                className="p-1 rounded hover:bg-slate-200 text-text-secondary"
              >
                {leftCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* 검색 */}
            {!leftCollapsed && (
              <div className="px-3 py-2 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                  />
                </div>
              </div>
            )}

            {/* 카테고리 버튼 목록 */}
            <nav className="flex-1 overflow-y-auto py-1">
              {categories.map((cat) => {
                const Icon = ICON_MAP[cat.icon] ?? HelpCircle;
                const active = !searchQuery && selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setSearchQuery('');
                      setExpandedItemId(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'text-text-secondary hover:bg-slate-100'
                    } ${leftCollapsed ? 'justify-center' : ''}`}
                    title={leftCollapsed ? cat.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!leftCollapsed && <span className="truncate">{cat.label}</span>}
                    {!leftCollapsed && (
                      <span className="ml-auto text-[10px] text-slate-400">{cat.items.length}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ─── 우측: 콘텐츠 ─── */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8">
              {/* 페이지 타이틀 */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary">도움말</h1>
                  <p className="text-sm text-text-secondary">MathLab 사용 가이드</p>
                </div>
              </div>

              {/* 검색 결과 모드 */}
              {searchResults !== null ? (
                <div>
                  <p className="text-sm text-text-secondary mb-4">
                    &ldquo;{searchQuery}&rdquo; 검색 결과{' '}
                    <span className="font-bold text-primary">{searchResults.length}건</span>
                  </p>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-16 text-text-secondary text-sm">
                      검색 결과가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {searchResults.map(({ categoryLabel, item }) => (
                        <AccordionItem
                          key={item.id}
                          item={item}
                          badge={categoryLabel}
                          expanded={expandedItemId === item.id}
                          onToggle={() =>
                            setExpandedItemId(expandedItemId === item.id ? null : item.id)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedCategory ? (
                <div>
                  {/* 카테고리 제목 */}
                  <div className="flex items-center gap-2 mb-5">
                    {(() => {
                      const Icon = ICON_MAP[selectedCategory.icon] ?? HelpCircle;
                      return <Icon className="w-5 h-5 text-primary" />;
                    })()}
                    <h2 className="text-lg font-bold text-text-primary">
                      {selectedCategory.label}
                    </h2>
                    <span className="text-xs text-slate-400 ml-1">
                      {selectedCategory.items.length}개 항목
                    </span>
                  </div>
                  <div className="space-y-3">
                    {selectedCategory.items.map((item) => (
                      <AccordionItem
                        key={item.id}
                        item={item}
                        expanded={expandedItemId === item.id}
                        onToggle={() =>
                          setExpandedItemId(expandedItemId === item.id ? null : item.id)
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-text-secondary text-sm">
                  좌측에서 카테고리를 선택하세요.
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* 비로그인 푸터 (임베드 모드에서는 숨김) */}
      {!embedded && !isLoggedIn && (
        <footer className="border-t border-slate-200 py-6 px-6 text-center text-sm text-text-secondary bg-white">
          &copy; 2024 MathLab. All rights reserved.
        </footer>
      )}
    </div>
  );
}

/* ═══ 아코디언 아이템 ═══ */
function AccordionItem({
  item,
  badge,
  expanded,
  onToggle,
}: {
  item: HelpItem;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 pr-4">
          {badge && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500 shrink-0">
              {badge}
            </span>
          )}
          <span className="text-sm font-semibold text-text-primary">{item.question}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-secondary shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {renderAnswer(item.answer)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ 간단한 마크다운 파싱 (볼드, 줄바꿈) ═══ */
function renderAnswer(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (!line.trim()) return <br key={i} />;

    // **볼드** 처리
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {i > 0 && lines[i - 1].trim() !== '' && '\n'}
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={j} className="font-semibold text-text-primary">
                {part.slice(2, -2)}
              </strong>
            );
          }
          // `code` 처리
          const codeParts = part.split(/(`[^`]+`)/g);
          return codeParts.map((cp, k) => {
            if (cp.startsWith('`') && cp.endsWith('`')) {
              return (
                <code
                  key={`${j}-${k}`}
                  className="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono text-primary"
                >
                  {cp.slice(1, -1)}
                </code>
              );
            }
            return <span key={`${j}-${k}`}>{cp}</span>;
          });
        })}
      </span>
    );
  });
}
