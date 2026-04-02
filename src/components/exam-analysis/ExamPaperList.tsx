'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from './StatusBadge';
import { FileSearch, Play, Trash2, RotateCw, School, X } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

function formatAnalyzedAt(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}.${dd} ${hh}:${min}`;
}

interface ExamPaperItem {
  id: string;
  title: string;
  subject: 'MATH' | 'ENGLISH';
  grade: string;
  examType: string;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  schoolName: string | null;
  schoolId: string | null;
  school: { id: string; name: string; district: string } | null;
  createdAt: string;
  teacher: { id: string; name: string };
  student: { id: string; name: string } | null;
  analyses: Array<{
    id: string;
    totalQuestions: number | null;
    totalPoints: number | null;
    earnedPoints: number | null;
    analyzedAt: string | null;
    modelVersion: string | null;
  }>;
}

interface ExamPaperListProps {
  items: ExamPaperItem[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  onAnalyze: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, data: Partial<ExamPaperItem>) => void;
  selectedId: string | null;
  canEditSchool?: boolean;
}

interface SchoolResult {
  id: string;
  name: string;
  schoolType: string;
  regionName: string | null;
  district: string;
}

export function ExamPaperList({
  items,
  total,
  page,
  limit,
  onPageChange,
  onSelect,
  onAnalyze,
  onDelete,
  onUpdate,
  selectedId,
  canEditSchool = false,
}: ExamPaperListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('시험지를 삭제하시겠습니까? 분석 결과도 함께 삭제됩니다.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/exam-analysis/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('삭제되었습니다');
      onDelete(id);
    } catch {
      toast.error('삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <FileSearch className="w-12 h-12 mb-3" />
        <p className="text-sm">업로드된 시험지가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {items.map(item => {
          const latestAnalysis = item.analyses[0];
          const isSelected = item.id === selectedId;

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`px-3 py-2.5 border-b cursor-pointer hover:bg-slate-50 transition-colors ${
                isSelected ? 'bg-blue-50 border-l-2 border-l-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">
                      {item.subject === 'MATH' ? '수학' : '영어'} · {item.grade}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  {latestAnalysis && item.status === 'COMPLETED' && (
                    <p className="text-xs text-slate-400 mt-1">
                      {latestAnalysis.totalQuestions}문항
                      {latestAnalysis.earnedPoints != null && latestAnalysis.totalPoints
                        ? ` · ${latestAnalysis.earnedPoints}/${latestAnalysis.totalPoints}점`
                        : ''}
                      {latestAnalysis.analyzedAt && (
                        <span className="ml-1 text-slate-300">
                          · {formatAnalyzedAt(latestAnalysis.analyzedAt)}
                        </span>
                      )}
                      {latestAnalysis.modelVersion?.includes('prompt') && (
                        <span className="ml-1 text-slate-300">
                          · {latestAnalysis.modelVersion.split('/ ').pop()}
                        </span>
                      )}
                    </p>
                  )}
                  {/* 학교 매칭 표시 */}
                  {canEditSchool && (
                    <SchoolMatchBadge
                      item={item}
                      onUpdate={onUpdate}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(item.status === 'PENDING' || item.status === 'FAILED') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAnalyze(item.id); }}
                      className="p-1 text-slate-400 hover:text-primary"
                      title="분석 실행"
                    >
                      {item.status === 'FAILED' ? <RotateCw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletingId === item.id}
                    className="p-1 text-slate-400 hover:text-red-500"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {total > limit && (
        <div className="p-2 border-t">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / limit)}
            onPageChange={onPageChange}
            compact
          />
        </div>
      )}
    </div>
  );
}

/** 학교 매칭 뱃지 — 클릭으로 학교 검색/변경 (MANAGER+) */
function SchoolMatchBadge({ item, onUpdate }: {
  item: ExamPaperItem;
  onUpdate?: (id: string, data: Partial<ExamPaperItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing]);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // grade에서 schoolType 추론
        const type = /^중/.test(item.grade) ? 'middle' : /^고/.test(item.grade) ? 'high' : '';
        const params = new URLSearchParams({ q: q.trim() });
        if (type) params.set('type', type);
        const res = await fetch(`/api/schools/search?${params}`);
        const json = await res.json();
        setResults(json.data || []);
      } catch {
        // 무시
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [item.grade]);

  const handleSelect = async (school: SchoolResult) => {
    try {
      const res = await fetch(`/api/exam-analysis/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, schoolName: school.name }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${school.name} 매칭 완료`);
      onUpdate?.(item.id, {
        schoolId: school.id,
        schoolName: school.name,
        school: { id: school.id, name: school.name, district: school.district },
      });
      setEditing(false);
    } catch {
      toast.error('학교 매칭에 실패했습니다');
    }
  };

  const handleUnlink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/exam-analysis/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: null }),
      });
      if (!res.ok) throw new Error();
      toast.success('학교 매칭 해제');
      onUpdate?.(item.id, { schoolId: null, school: null });
    } catch {
      toast.error('매칭 해제에 실패했습니다');
    }
  };

  const schoolName = item.school?.name || item.schoolName;

  return (
    <div className="mt-1 relative" ref={containerRef}>
      {item.school ? (
        // 매칭된 상태
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-sm px-1.5 py-0.5">
          <School className="w-2.5 h-2.5" />
          {item.school.name}
          <button
            onClick={handleUnlink}
            className="ml-0.5 text-emerald-400 hover:text-red-500"
            title="매칭 해제"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ) : schoolName ? (
        // schoolName은 있지만 매칭 안 됨
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); setQuery(schoolName); search(schoolName); }}
          className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-sm px-1.5 py-0.5 hover:bg-amber-100 transition-colors"
          title="학교 매칭하기"
        >
          <School className="w-2.5 h-2.5" />
          {schoolName} (미매칭)
        </button>
      ) : (
        // schoolName 없음
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          title="학교 매칭하기"
        >
          <School className="w-2.5 h-2.5" />
          학교 미지정
        </button>
      )}

      {/* 학교 검색 드롭다운 */}
      {editing && (
        <div
          className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-sm shadow-lg z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            placeholder="학교명 검색..."
            className="w-full px-3 py-1.5 text-xs border-b outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {searching && <p className="px-3 py-2 text-[10px] text-slate-400">검색 중...</p>}
            {!searching && results.length === 0 && query.length >= 2 && (
              <p className="px-3 py-2 text-[10px] text-slate-400">검색 결과 없음</p>
            )}
            {results.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <span className="font-medium text-slate-700">{s.name}</span>
                <span className="text-slate-400 ml-1">
                  {s.regionName} {s.district}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
