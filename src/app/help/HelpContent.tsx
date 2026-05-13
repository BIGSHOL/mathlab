'use client';

/**
 * /help, /help-popup 공통 콘텐츠 — Pattern G V1 (도움말 모드)
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html § V1
 *
 * 데이터 fetch: 기존 GET /api/help 유지 (HelpCategory + HelpItem)
 * 매핑:
 *   - 카테고리 → DocsTocGroup (좌측 ToC)
 *   - 아이템 → DocsTocItem
 *   - 선택된 아이템 → docs-body (h1 + answer)
 *
 * 변경:
 *   - 아코디언 → ToC 클릭 시 단일 아이템 표시
 *   - 검색 기능 제거 (시안에 없음, 매니페스트 §C1)
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LogoIcon } from '@/components/ui/LogoIcon';
import { DocsLayout, DocsToc, AnchorNav } from '@/components/docs';
import type { DocsTocGroup } from '@/components/docs';
import type { HelpCategory } from '@/lib/data/help';

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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/help')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((res) => {
        const cats: HelpCategory[] = res.data ?? [];
        setCategories(cats);
        // 첫 카테고리의 첫 아이템 자동 선택
        const first = cats[0]?.items[0]?.id;
        if (first) setSelectedItemId(first);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ─── 카테고리 → DocsTocGroup 변환 ─── */
  const tocGroups: DocsTocGroup[] = useMemo(
    () =>
      categories.map((cat) => ({
        title: cat.label,
        items: cat.items.map((it) => ({
          id: it.id,
          label: it.question,
        })),
      })),
    [categories]
  );

  /* ─── 선택된 아이템 + 카테고리 ─── */
  const { selectedItem, selectedCategory } = useMemo(() => {
    if (!selectedItemId) return { selectedItem: null, selectedCategory: null };
    for (const cat of categories) {
      const it = cat.items.find((x) => x.id === selectedItemId);
      if (it) return { selectedItem: it, selectedCategory: cat };
    }
    return { selectedItem: null, selectedCategory: null };
  }, [selectedItemId, categories]);

  /* ─── 본문 앵커 (선택 아이템 안에서 h2 자동 추출) ─── */
  const anchors = useMemo(() => {
    if (!selectedItem) return [];
    const lines = selectedItem.answer.split('\n');
    const list: Array<{ id: string; label: string; level?: 0 | 1 }> = [];
    lines.forEach((l, i) => {
      // "## 제목" 패턴 추출
      const m = l.match(/^##\s+(.+)$/);
      if (m) {
        list.push({
          id: `sec-${i}`,
          label: m[1].trim(),
        });
      }
    });
    return list;
  }, [selectedItem]);

  return (
    <div
      className={
        embedded
          ? 'flex-1 flex flex-col bg-white'
          : 'min-h-screen flex flex-col bg-white'
      }
    >
      {/* 헤더 (임베드 모드에서는 숨김) */}
      {!embedded && (
        <header className="flex items-center justify-between border-b border-slate-200 px-6 md:px-10 py-3 bg-white sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <LogoIcon className="w-6 h-6" />
            <Link href={backHref} className="text-lg font-bold tracking-tight text-text-primary">
              Injaewon MathLAB
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
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
            불러오는 중...
          </div>
        ) : categories.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
            도움말 항목이 없습니다.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <DocsLayout
              toc={
                <DocsToc
                  groups={tocGroups}
                  activeId={selectedItemId ?? undefined}
                  onSelect={setSelectedItemId}
                />
              }
              aside={
                <AnchorNav
                  anchors={anchors}
                  feedback={{
                    title: '실시간 채팅',
                    description: '평일 9–18시 · 평균 응답 2분',
                    ctaLabel: '💬 문의하기',
                    ctaHref: '/support',
                  }}
                />
              }
            >
              <article className="docs-body">
                {selectedItem && selectedCategory ? (
                  <>
                    <div className="breadcrumb">
                      도움말 / <b>{selectedCategory.label}</b> /{' '}
                      <b>{selectedItem.question}</b>
                    </div>
                    <h1>{selectedItem.question}</h1>
                    <div className="updated">
                      {selectedItem.tags?.length
                        ? `태그: ${selectedItem.tags.join(', ')}`
                        : `${selectedCategory.label} 카테고리`}
                    </div>
                    {renderHelpAnswer(selectedItem.answer)}
                    <div className="meta-row">
                      <div className="helpful">
                        이 문서가 도움이 되었나요?
                        <button type="button" className="btn-sm">
                          👍 예
                        </button>
                        <button type="button" className="btn-sm">
                          👎 아니요
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)' }}>
                    좌측에서 항목을 선택하세요.
                  </div>
                )}
              </article>
            </DocsLayout>
          </div>
        )}
      </div>

      {/* 비로그인 푸터 (임베드 모드에서는 숨김) */}
      {!embedded && !isLoggedIn && (
        <footer className="border-t border-slate-200 py-6 px-6 text-center text-sm text-text-secondary bg-white">
          &copy; 2024 Injaewon MathLAB. All rights reserved.
        </footer>
      )}
    </div>
  );
}

/* ═══ 마크다운 → 시안 docs-body 렌더링 ═══ */
function renderHelpAnswer(text: string) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(
      <Tag key={`l-${key++}`}>
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
    listBuffer = [];
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 빈 줄
    if (!trimmed) {
      flushList();
      continue;
    }

    // h2 (##)
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      flushList();
      blocks.push(
        <h2 key={`h-${key++}`} id={`sec-${blocks.length}`}>
          {renderInline(h2[1])}
        </h2>
      );
      continue;
    }

    // h3 (###)
    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      flushList();
      blocks.push(
        <h3 key={`h-${key++}`}>{renderInline(h3[1])}</h3>
      );
      continue;
    }

    // ul (- 또는 *)
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listBuffer.push(ulMatch[1]);
      continue;
    }

    // ol (1. 2. ...)
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listBuffer.push(olMatch[1]);
      continue;
    }

    // 일반 단락
    flushList();
    blocks.push(<p key={`p-${key++}`}>{renderInline(trimmed)}</p>);
  }
  flushList();
  return <>{blocks}</>;
}

function renderInline(line: string): React.ReactNode {
  // **볼드** + `code` 처리
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <b key={i}>{part.slice(2, -2)}</b>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="inline">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
