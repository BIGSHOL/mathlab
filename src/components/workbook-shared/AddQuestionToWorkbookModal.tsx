'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { MathRenderer } from '@/components/math/MathRenderer';
import { AddModalShell } from './_AddModalShell';
import { AddModalRow, MetaTag, MetaSep } from './_AddModalRow';
import { CurriculumFilter, EMPTY_FILTER, type CurriculumFilterValue } from './_CurriculumFilter';

interface QuestionRow {
  id: string;
  bookCode: string;
  chapter: string;
  section: string | null;
  questionNum: number;
  content: string;
  difficulty: string;
  type: string;
}

interface Props {
  workbookId: string;
  sectionId: string;
  onClose: () => void;
  onAdded: () => void;
}

/** 문제 본문에서 `<보기>` 블록(blockquote)을 제거해 미리보기에선 본문만 표시 */
function stripQuoteBlock(content: string): string {
  // ">로 시작하는 줄을 모두 제거" — blockquote 라인 단위
  return content
    .split('\n')
    .filter((line) => !line.trim().startsWith('>'))
    .join('\n')
    .replace(/<보기[^>]*>/g, '') // 인라인 마커 제거
    .trim();
}

export function AddQuestionToWorkbookModal({ workbookId, sectionId, onClose, onAdded }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CurriculumFilterValue>(EMPTY_FILTER);
  const [results, setResults] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Set<string>>(new Set());

  /** 학제 → bookCodePrefix 매핑 */
  const bookCodePrefix = useMemo(() => {
    if (filter.level === 'elementary') return 'E';
    if (filter.level === 'middle' || filter.level === 'high') return '';
    return null;
  }, [filter.level]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (bookCodePrefix !== null) params.set('bookCodePrefix', bookCodePrefix);
      if (filter.chapter) params.set('chapter', filter.chapter);
      if (filter.section) params.set('section', filter.section);
      params.set('limit', '50');

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.data ?? []);
      }
    } catch (err) {
      console.error('[AddQuestionToWorkbookModal] 조회 실패:', err);
    }
    setLoading(false);
  }, [search, filter, bookCodePrefix]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchList(), 300);
    return () => clearTimeout(timer);
  }, [fetchList]);

  const handleAdd = async (q: QuestionRow) => {
    setAdding((prev) => new Set(prev).add(q.id));
    try {
      const res = await fetch(`/api/workbooks/${workbookId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'QUESTION',
          sectionId,
          questionId: q.id,
          answerSpace: 'MEDIUM',
        }),
      });
      if (res.ok) {
        toast.success(`${q.chapter} #${q.questionNum} 추가됨`);
        onAdded();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || '추가 실패');
      }
    } catch (err) {
      console.error('[AddQuestionToWorkbookModal] 추가 실패:', err);
      toast.error('추가에 실패했습니다');
    }
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(q.id);
      return next;
    });
  };

  return (
    <AddModalShell
      icon={<FileText className="w-5 h-5" />}
      title="문제 추가"
      onClose={onClose}
      footerHint="클릭하면 즉시 워크북에 추가됩니다 (보기 박스는 인쇄 시 정상 노출)"
    >
      <div className="space-y-2 mb-3 shrink-0">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="문제 본문 검색..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:border-primary"
          />
        </div>

        {/* 캐스케이드: 학제 → 학년·학기 → 대단원 → 중단원 */}
        <CurriculumFilter value={filter} onChange={setFilter} />
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-12">
            조건에 맞는 문제가 없습니다.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {results.map((q) => (
              <AddModalRow
                key={q.id}
                meta={
                  <>
                    <MetaTag variant="code">{q.bookCode}</MetaTag>
                    <MetaSep />
                    <MetaTag>{q.chapter}</MetaTag>
                    {q.section && (
                      <>
                        <MetaSep />
                        <MetaTag>{q.section}</MetaTag>
                      </>
                    )}
                    <MetaSep />
                    <MetaTag>#{q.questionNum}</MetaTag>
                  </>
                }
                badge={<MetaTag variant="badge">{q.difficulty}</MetaTag>}
                title={
                  <div className="line-clamp-3">
                    <MathRenderer content={stripQuoteBlock(q.content)} />
                  </div>
                }
                onAdd={() => handleAdd(q)}
                adding={adding.has(q.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </AddModalShell>
  );
}
