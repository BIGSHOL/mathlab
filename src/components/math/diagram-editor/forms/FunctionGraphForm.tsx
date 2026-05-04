'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps, Point2DInput } from '../types';
import { LINE_COLOR_OPTIONS } from '../types';
import { NumField, PointListEditor } from '../SharedControls';

export function FunctionGraphForm({ params, onChange }: SubFormProps) {
  const xRange = Array.isArray(params.xRange) ? params.xRange as number[] : [-5, 5];
  const yRange = Array.isArray(params.yRange) ? params.yRange as number[] : [-5, 5];
  const functions = Array.isArray(params.functions) ? params.functions as { expression: string; color?: string; label?: string; dashed?: boolean }[] : [];
  const points = Array.isArray(params.points) ? params.points as Point2DInput[] : [];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <NumField label="X 최소" value={xRange[0]} onChange={(v) => onChange({ xRange: [v, xRange[1]] })} />
        <NumField label="X 최대" value={xRange[1]} onChange={(v) => onChange({ xRange: [xRange[0], v] })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Y 최소" value={yRange[0]} onChange={(v) => onChange({ yRange: [v, yRange[1]] })} />
        <NumField label="Y 최대" value={yRange[1]} onChange={(v) => onChange({ yRange: [yRange[0], v] })} />
      </div>
      <NumField label="눈금 간격" value={Number(params.gridStep) || 1} onChange={(v) => onChange({ gridStep: v })} min={0.5} step={0.5} />
      {/* 함수 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">함수</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ functions: [...functions, { expression: 'x' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {functions.map((f, i) => (
          <div key={i} className="space-y-1 mt-1.5 p-1.5 bg-slate-50 rounded border border-slate-100">
            <div className="flex gap-1 items-center">
              <input type="text" value={f.expression} onChange={(e) => { const arr = [...functions]; arr[i] = { ...f, expression: e.target.value }; onChange({ functions: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded font-mono bg-white" placeholder="예: 2*x+1" />
              <input type="text" value={f.label || ''} onChange={(e) => { const arr = [...functions]; arr[i] = { ...f, label: e.target.value }; onChange({ functions: arr }); }} className="w-20 text-xs px-1.5 py-0.5 border border-slate-300 rounded bg-white" placeholder="라벨" />
              <button type="button" onClick={() => onChange({ functions: functions.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-1.5 items-center">
              <div className="flex gap-1 items-center">
                {LINE_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => { const arr = [...functions]; arr[i] = { ...f, color: c.value || undefined }; onChange({ functions: arr }); }}
                    className={`w-4 h-4 rounded-full border transition-all ${(f.color || '') === c.value ? 'border-slate-800 scale-110' : 'border-slate-200'}`}
                    style={{ backgroundColor: c.value || '#333' }}
                    title={c.label}
                  />
                ))}
              </div>
              <label className="flex items-center gap-0.5 text-xs text-slate-500 cursor-pointer ml-1 shrink-0">
                <input type="checkbox" checked={!!f.dashed} onChange={(e) => { const arr = [...functions]; arr[i] = { ...f, dashed: e.target.checked }; onChange({ functions: arr }); }} className="rounded w-3 h-3" />
                점선
              </label>
            </div>
          </div>
        ))}
      </div>
      <PointListEditor points={points} onChange={(pts) => onChange({ points: pts })} label="점" />
    </div>
  );
}
