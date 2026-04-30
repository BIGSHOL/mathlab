'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { AddModalShell } from './_AddModalShell';
import { AddModalRow, MetaTag, MetaSep } from './_AddModalRow';

interface TestRow {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  grade: number;
  testType: string;
  questionCount: number;
  timeLimitMin: number | null;
  isActive: boolean;
}

interface Props {
  workbookId: string;
  sectionId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddTestToWorkbookModal({ workbookId, sectionId, onClose, onAdded }: Props) {
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [results, setResults] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Set<string>>(new Set());

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (grade) params.set('grade', grade);
      params.set('limit', '30');
      const res = await fetch(`/api/tests?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.data ?? []);
      }
    } catch (err) {
      console.error('[AddTestToWorkbookModal] 조회 실패:', err);
    }
    setLoading(false);
  }, [search, grade]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchList(), 300);
    return () => clearTimeout(timer);
  }, [fetchList]);

  const handleAdd = async (t: TestRow) => {
    setAdding((prev) => new Set(prev).add(t.id));
    try {
      const res = await fetch(`/api/workbooks/${workbookId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'TEST_PAPER',
          sectionId,
          testId: t.id,
          answerSpace: 'MEDIUM',
        }),
      });
      if (res.ok) {
        toast.success(`"${t.title}" (${t.questionCount}문항) 추가됨`);
        onAdded();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || '추가 실패');
      }
    } catch (err) {
      console.error('[AddTestToWorkbookModal] 추가 실패:', err);
      toast.error('추가에 실패했습니다');
    }
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(t.id);
      return next;
    });
  };

  return (
    <AddModalShell
      icon={<ClipboardCheck className="w-5 h-5" />}
      title="시험지 추가"
      onClose={onClose}
      footerHint="시험지 통째로(전체 문항) 추가됩니다"
    >
      <div className="flex gap-2 mb-3 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="시험 제목 검색..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:border-primary"
        >
          <option value="">전체 학년</option>
          <option value="1">1학년 (중·고)</option>
          <option value="2">2학년 (중·고)</option>
          <option value="3">3학년 (중·고)</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-12">
            조건에 맞는 시험지가 없습니다.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {results.map((t) => (
              <AddModalRow
                key={t.id}
                meta={
                  <>
                    <MetaTag variant="code">#{t.seq}</MetaTag>
                    <MetaSep />
                    <MetaTag>{t.grade}학년</MetaTag>
                    <MetaSep />
                    <MetaTag>{t.testType}</MetaTag>
                  </>
                }
                badge={<MetaTag variant="badge">{t.questionCount}문항</MetaTag>}
                title={t.title}
                subtitle={t.description || undefined}
                onAdd={() => handleAdd(t)}
                adding={adding.has(t.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </AddModalShell>
  );
}
