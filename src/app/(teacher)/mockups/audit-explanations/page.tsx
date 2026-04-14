'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { toast } from '@/components/ui/Toast';
import { Loader2, CheckCircle2 } from 'lucide-react';

type Diff = {
  field: 'explanation' | 'answer';
  before: string;
  after: string;
  trivial: boolean;
};
type AnswerIssue = { code: string; label: string; msg: string };
type Item = {
  id: string;
  bookCode: string | null;
  questionNum: number | null;
  chapter: string | null;
  diffs: Diff[];
  suspicious?: { reason: string; sample: string };
  answerIssues?: AnswerIssue[];
  preview?: {
    content: string;
    answer: string;
    explanation: string;
    choices?: string[];
    type?: string;
  };
};

export default function AuditExplanationsMockupPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fieldFilter, setFieldFilter] = useState<'all' | 'explanation' | 'answer' | 'answerIssue'>('all');
  const [hideTrivial, setHideTrivial] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-explanations');
      const json = await res.json();
      if (json.data) {
        setItems(json.data.items);
        setTotal(json.data.total);
        // 기본: 전체 선택
        setSelected(new Set(json.data.items.map((i: Item) => i.id)));
      } else {
        toast.error('로드 실패');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // trivial(공백/줄바꿈만) 숨기기 + 필드 필터
  const visibleItems = items
    .map((i) => ({
      ...i,
      diffs: i.diffs.filter((d) => {
        if (hideTrivial && d.trivial) return false;
        if (fieldFilter === 'all' || fieldFilter === 'answerIssue') return true;
        return d.field === fieldFilter;
      }),
    }))
    .filter((i) => {
      if (fieldFilter === 'answerIssue') {
        return (i.answerIssues?.length ?? 0) > 0;
      }
      return i.diffs.length > 0 || i.suspicious || (i.answerIssues?.length ?? 0) > 0;
    });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const allSelected = visibleItems.every((i) => selected.has(i.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) visibleItems.forEach((i) => next.delete(i.id));
      else visibleItems.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const apply = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.warning('선택된 항목이 없습니다');
      return;
    }
    if (!confirm(`${ids.length}개 문제를 DB에 반영합니다. 계속할까요?`)) return;
    setApplying(true);
    try {
      const res = await fetch('/api/admin/audit-explanations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (json.data) {
        toast.success(`${json.data.applied}개 반영 완료`);
        await load();
        setSelected(new Set());
      } else {
        toast.error('반영 실패');
      }
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-4 md:p-6 gap-4 overflow-y-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">해설 후처리 감사 (Audit)</h1>
          <p className="text-sm text-text-secondary mt-1">
            후처리 정규화가 필요한 해설/본문/정답을 전수 스캔. BEFORE/AFTER 비교 후 선택 반영.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 로딩</> : '새로고침'}
          </Button>
          <Button size="sm" onClick={apply} disabled={applying || selected.size === 0}>
            {applying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 반영 중</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> 선택 {selected.size}건 반영</>}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm bg-white rounded-sm border border-slate-200 p-3">
        <span className="text-text-secondary">
          전체 {total}문제 중 <span className="font-bold text-primary">{items.length}</span>건 변경 대상 · 선택 {selected.size}건
        </span>
        <div className="flex flex-wrap gap-1 ml-auto items-center">
          <label className="flex items-center gap-1.5 mr-2 text-xs text-text-secondary cursor-pointer">
            <input type="checkbox" checked={hideTrivial} onChange={(e) => setHideTrivial(e.target.checked)} className="w-3.5 h-3.5" />
            공백만 변경된 항목 숨기기
          </label>
          {(['all', 'explanation', 'answer', 'answerIssue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFieldFilter(f)}
              className={`px-3 py-1 rounded-sm text-xs font-bold ${
                fieldFilter === f ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? '전체' : f === 'answerIssue' ? '답 의심' : f}
            </button>
          ))}
          <button
            onClick={toggleAllVisible}
            className="px-3 py-1 rounded-sm text-xs font-bold bg-slate-100 text-text-secondary hover:bg-slate-200"
          >
            보이는 항목 전체 토글
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> 감사 실행 중...
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleItems.length === 0 && (
            <div className="text-center py-16 text-text-secondary">모든 해설이 정상입니다 ✓</div>
          )}
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-sm border p-4 ${
                selected.has(item.id) ? 'border-primary' : 'border-slate-200'
              }`}
            >
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="w-4 h-4"
                />
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-sm">
                  {item.bookCode ?? '?'} #{item.questionNum ?? '?'}
                </span>
                {item.chapter && (
                  <span className="px-2 py-0.5 bg-slate-100 text-text-secondary text-xs rounded-sm">{item.chapter}</span>
                )}
                <span className="text-xs text-text-secondary">
                  {item.diffs.map((d) => d.field).join(', ')}
                </span>
                {item.suspicious && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-sm" title={item.suspicious.sample}>
                    ⚠️ {item.suspicious.reason}
                  </span>
                )}
                {item.answerIssues?.map((ai, k) => (
                  <span key={k} className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-sm" title={ai.msg}>
                    🚨 {ai.label}
                  </span>
                ))}
              </label>
              {item.answerIssues && item.answerIssues.length > 0 && item.preview && (
                <div className="mb-3 p-3 bg-rose-50 rounded-sm border border-rose-200 text-sm">
                  <div className="text-xs font-bold text-rose-700 mb-2">답 의심 상세</div>
                  <div className="space-y-1">
                    <div><span className="font-bold text-text-secondary">문제:</span> <MathRenderer content={item.preview.content} /></div>
                    {item.preview.choices && item.preview.choices.length > 0 && (
                      <div className="grid grid-cols-2 gap-1 my-1">
                        {item.preview.choices.map((c, ci) => (
                          <div key={ci} className="px-2 py-1 bg-white rounded-sm border border-slate-200 text-xs">
                            <span className="text-text-secondary mr-1">{['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'][ci] ?? `${ci+1}.`}</span>
                            <MathRenderer content={c} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div><span className="font-bold text-text-secondary">답:</span> <span className="text-rose-700 font-bold"><MathRenderer content={item.preview.answer} /></span></div>
                    <ul className="text-xs text-rose-700 mt-2 space-y-0.5">
                      {item.answerIssues.map((ai, k) => (
                        <li key={k}>• [{ai.label}] {ai.msg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {item.diffs
                  .filter((d) => fieldFilter === 'all' || d.field === fieldFilter)
                  .map((d, idx) => (
                  <div key={idx} className="border-t border-slate-100 pt-3">
                    <div className="text-xs font-bold text-text-secondary mb-2">◉ {d.field}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] text-red-600 font-bold mb-1">BEFORE</div>
                        <div className="rounded-sm border border-red-200 bg-red-50/30 p-3 text-sm">
                          <MathRenderer content={d.before} />
                        </div>
                        <details className="mt-1">
                          <summary className="text-[10px] text-text-secondary cursor-pointer">raw</summary>
                          <pre className="text-[10px] whitespace-pre-wrap break-all text-text-secondary">{d.before}</pre>
                        </details>
                      </div>
                      <div>
                        <div className="text-[11px] text-emerald-600 font-bold mb-1">AFTER</div>
                        <div className="rounded-sm border border-emerald-200 bg-emerald-50/30 p-3 text-sm">
                          <MathRenderer content={d.after} />
                        </div>
                        <details className="mt-1">
                          <summary className="text-[10px] text-text-secondary cursor-pointer">raw</summary>
                          <pre className="text-[10px] whitespace-pre-wrap break-all text-text-secondary">{d.after}</pre>
                        </details>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
