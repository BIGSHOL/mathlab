'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ConflictRow {
  row: number;
  title: string;
  existing: {
    id: string;
    title: string;
    grade: string | null;
    chapter: string | null;
    section: string | null;
  };
}

interface ConceptConflictDialogProps {
  conflict: { layer: 'B'; rows: ConflictRow[] } | null;
  submitting: boolean;
  onResolve: (action: 'force' | 'skip' | 'cancel') => void;
}

export function ConceptConflictDialog({ conflict, submitting, onResolve }: ConceptConflictDialogProps) {
  if (!conflict) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-sm max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900">개념 중복 의심 ({conflict.rows.length}건)</h3>
          </div>
          <button
            onClick={() => onResolve('cancel')}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 text-sm text-slate-600 border-b bg-amber-50">
          <p>같은 <b>학년·대단원</b>에 <b>동일 제목</b>의 개념이 이미 있습니다. (section만 다름)</p>
          <p className="text-xs mt-1 text-slate-500">
            → 의도적으로 병존시키려면 <b>강제 저장</b>, 기존을 유지하려면 <b>제외하고 저장</b>, 되돌리려면 <b>취소</b>.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <table className="w-full text-xs">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">새 개념 (추출)</th>
                <th className="py-2 pr-2">기존 개념 (DB)</th>
                <th className="py-2">비교</th>
              </tr>
            </thead>
            <tbody>
              {conflict.rows.map((r) => (
                <tr key={r.row} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-2 text-slate-400">{r.row + 1}</td>
                  <td className="py-2 pr-2">
                    <div className="font-medium text-slate-900">{r.title}</div>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="font-medium text-slate-900">{r.existing.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {r.existing.grade || '-'} · {r.existing.chapter || '-'} · {r.existing.section || '-'}
                    </div>
                  </td>
                  <td className="py-2 text-[11px] text-amber-700">
                    같은 대단원, 제목 동일
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-slate-50">
          <Button variant="secondary" onClick={() => onResolve('cancel')} disabled={submitting}>
            취소
          </Button>
          <Button variant="secondary" onClick={() => onResolve('skip')} disabled={submitting}>
            제외하고 저장
          </Button>
          <Button onClick={() => onResolve('force')} disabled={submitting}>
            강제 저장 (force)
          </Button>
        </div>
      </div>
    </div>
  );
}
