'use client';

import { useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from './StatusBadge';
import { FileSearch, Play, Trash2, RotateCw } from 'lucide-react';
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
  createdAt: string;
  teacher: { id: string; name: string };
  student: { id: string; name: string } | null;
  analyses: Array<{
    id: string;
    totalQuestions: number | null;
    totalPoints: number | null;
    earnedPoints: number | null;
    analyzedAt: string | null;
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
  selectedId: string | null;
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
  selectedId,
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
                    </p>
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
