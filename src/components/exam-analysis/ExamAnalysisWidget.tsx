'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileSearch, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface WidgetData {
  total: number;
  completed: number;
  analyzing: number;
  failed: number;
  recent: Array<{ id: string; title: string; status: string; grade: string }>;
}

export function ExamAnalysisWidget() {
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    fetch('/api/exam-analysis?limit=5')
      .then(r => r.json())
      .then(json => {
        const items = json.data || [];
        setData({
          total: json.meta?.total || 0,
          completed: items.filter((i: { status: string }) => i.status === 'COMPLETED').length,
          analyzing: items.filter((i: { status: string }) => i.status === 'ANALYZING').length,
          failed: items.filter((i: { status: string }) => i.status === 'FAILED').length,
          recent: items.slice(0, 3).map((i: { id: string; title: string; status: string; grade: string }) => ({
            id: i.id, title: i.title, status: i.status, grade: i.grade,
          })),
        });
      })
      .catch(() => {});
  }, []);

  if (!data || data.total === 0) return null;

  return (
    <div className="bg-white border rounded-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-800">기출 분석</h3>
        </div>
        <Link href="/exam-analysis" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          전체보기 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex gap-3 mb-3">
        <Stat icon={<CheckCircle className="w-3.5 h-3.5 text-green-500" />} label="완료" value={data.completed} />
        <Stat icon={<Clock className="w-3.5 h-3.5 text-blue-500" />} label="진행 중" value={data.analyzing} />
        {data.failed > 0 && (
          <Stat icon={<AlertCircle className="w-3.5 h-3.5 text-red-500" />} label="실패" value={data.failed} />
        )}
      </div>

      {data.recent.length > 0 && (
        <div className="space-y-1">
          {data.recent.map(item => (
            <Link
              key={item.id}
              href={`/exam-analysis`}
              className="flex items-center justify-between px-2 py-1.5 rounded-sm hover:bg-slate-50 text-sm"
            >
              <span className="truncate text-slate-700">{item.title}</span>
              <span className="text-xs text-slate-400 shrink-0 ml-2">{item.grade}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {icon}
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
