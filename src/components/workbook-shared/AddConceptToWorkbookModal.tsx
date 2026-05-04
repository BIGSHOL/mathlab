'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { AddModalShell } from './_AddModalShell';
import { AddModalRow, MetaTag, MetaSep } from './_AddModalRow';
import { CurriculumFilter, EMPTY_FILTER, type CurriculumFilterValue } from './_CurriculumFilter';
import { parseCurriculumKey } from './_curriculumFilterUtils';

interface ConceptRow {
  id: string;
  title: string;
  grade: string | null;
  semester: number | null;
  chapter: string | null;
  section: string | null;
  conceptCode: string | null;
}

interface Props {
  workbookId: string;
  sectionId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddConceptToWorkbookModal({ workbookId, sectionId, onClose, onAdded }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CurriculumFilterValue>(EMPTY_FILTER);
  const [results, setResults] = useState<ConceptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Set<string>>(new Set());
  // 워크북 출력 전용 풍부 본문(textbook-rich) 카테고리 토글
  const [richMode, setRichMode] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (richMode) params.set('source', 'textbook-rich');

      // 학년·학기 매핑 (curriculum 키 → API)
      if (filter.level && filter.gradeKey) {
        const { grade, semester } = parseCurriculumKey(filter.level, filter.gradeKey);
        if (grade) params.set('grade', grade);
        if (semester) params.set('semester', String(semester));
      } else if (filter.level) {
        // 학제만 선택 — 학년 그룹으로 OR 검색
        const groups: Record<string, string> = {
          elementary: 'elementary_3,elementary_4,elementary_5,elementary_6',
          middle: 'middle_1,middle_2,middle_3',
          high: 'high_1,high_2,high_algebra,high_calculus1,high_calculus2,high_prob,high_geo',
        };
        params.set('grade', groups[filter.level]);
      }
      if (filter.chapter) params.set('chapter', filter.chapter);
      if (filter.section) params.set('section', filter.section);
      params.set('limit', '50');

      const res = await fetch(`/api/concepts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.data ?? []);
      }
    } catch (err) {
      console.error('[AddConceptToWorkbookModal] 조회 실패:', err);
    }
    setLoading(false);
  }, [search, filter, richMode]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchList(), 300);
    return () => clearTimeout(timer);
  }, [fetchList]);

  const handleAdd = async (c: ConceptRow) => {
    setAdding((prev) => new Set(prev).add(c.id));
    try {
      const res = await fetch(`/api/workbooks/${workbookId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'CONCEPT_DOC',
          sectionId,
          conceptId: c.id,
          answerSpace: 'NONE',
        }),
      });
      if (res.ok) {
        toast.success(`"${c.title}" 추가됨`);
        onAdded();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || '추가 실패');
      }
    } catch (err) {
      console.error('[AddConceptToWorkbookModal] 추가 실패:', err);
      toast.error('추가에 실패했습니다');
    }
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(c.id);
      return next;
    });
  };

  return (
    <AddModalShell
      icon={<BookOpen className="w-5 h-5" />}
      title="개념 추가"
      onClose={onClose}
      footerHint="클릭하면 즉시 워크북에 추가됩니다 (계속 추가 가능)"
    >
      <div className="space-y-2 mb-3 shrink-0">
        {/* 검색 + 카테고리 segmented */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="개념 제목 검색..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:border-primary"
            />
          </div>
          {/* 일반 / 풍부 본문 segmented */}
          <div className="inline-flex rounded-sm border border-slate-200 overflow-hidden text-xs shrink-0">
            <button
              type="button"
              onClick={() => setRichMode(false)}
              className={`px-3 py-2 transition-colors ${
                !richMode ? 'bg-primary text-white font-semibold' : 'bg-white text-text-secondary hover:bg-slate-50'
              }`}
            >
              학생 학습용
            </button>
            <button
              type="button"
              onClick={() => setRichMode(true)}
              className={`px-3 py-2 transition-colors border-l border-slate-200 ${
                richMode ? 'bg-primary text-white font-semibold' : 'bg-white text-text-secondary hover:bg-slate-50'
              }`}
              title="워크북 출력 전용 풍부 본문 (학생 빈칸 학습과 분리)"
            >
              📖 풍부 본문
            </button>
          </div>
        </div>

        {/* 캐스케이드: 학제 → 학년 → 대단원 → 중단원 */}
        <CurriculumFilter value={filter} onChange={setFilter} />
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-12">
            조건에 맞는 개념이 없습니다.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {results.map((c) => (
              <AddModalRow
                key={c.id}
                meta={
                  <>
                    {c.conceptCode && <MetaTag variant="code">{c.conceptCode}</MetaTag>}
                    {c.grade && (
                      <>
                        {c.conceptCode && <MetaSep />}
                        <MetaTag>{c.grade}</MetaTag>
                      </>
                    )}
                    {c.semester != null && (
                      <>
                        <MetaSep />
                        <MetaTag>{c.semester}학기</MetaTag>
                      </>
                    )}
                  </>
                }
                title={c.title}
                subtitle={
                  c.chapter
                    ? `${c.chapter}${c.section ? ` · ${c.section}` : ''}`
                    : undefined
                }
                onAdd={() => handleAdd(c)}
                adding={adding.has(c.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </AddModalShell>
  );
}
