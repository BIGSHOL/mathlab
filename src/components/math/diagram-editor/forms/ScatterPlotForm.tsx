'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps } from '../types';
import { NumField, BoolField, TextField } from '../SharedControls';

export function ScatterPlotForm({ params, onChange }: SubFormProps) {
  const points = Array.isArray(params.points) ? (params.points as { x: number; y: number; label?: string }[]) : [];
  const xRange = Array.isArray(params.xRange) ? (params.xRange as [number, number]) : [0, 10];
  const yRange = Array.isArray(params.yRange) ? (params.yRange as [number, number]) : [0, 10];
  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <div className="grid grid-cols-2 gap-2">
        <NumField label="X 최소" value={xRange[0]} onChange={(v) => onChange({ xRange: [v, xRange[1]] })} />
        <NumField label="X 최대" value={xRange[1]} onChange={(v) => onChange({ xRange: [xRange[0], v] })} />
        <NumField label="Y 최소" value={yRange[0]} onChange={(v) => onChange({ yRange: [v, yRange[1]] })} />
        <NumField label="Y 최대" value={yRange[1]} onChange={(v) => onChange({ yRange: [yRange[0], v] })} />
      </div>
      <NumField label="격자 간격" value={Number(params.gridStep) || 1} onChange={(v) => onChange({ gridStep: v })} min={0.1} step={0.5} />
      <TextField label="X축 라벨" value={String(params.xLabel || '')} onChange={(v) => onChange({ xLabel: v })} />
      <TextField label="Y축 라벨" value={String(params.yLabel || '')} onChange={(v) => onChange({ yLabel: v })} />
      <BoolField label="추세선 표시" value={!!params.showTrendLine} onChange={(v) => onChange({ showTrendLine: v })} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">점 ({points.length}개)</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ points: [...points, { x: 0, y: 0 }] })}><Plus className="w-3 h-3 inline" /> 추가</button>
        </div>
        <div className="max-h-32 overflow-y-auto">
          {points.map((p, i) => (
            <div key={i} className="flex gap-1 mt-1 items-center">
              <span className="text-xs text-slate-400 w-3">{i + 1}</span>
              <input type="number" value={p.x} onChange={(e) => { const arr = [...points]; arr[i] = { ...p, x: parseFloat(e.target.value) || 0 }; onChange({ points: arr }); }} className="w-14 text-xs px-1 py-0.5 border border-slate-300 rounded" step="0.1" title="x" />
              <input type="number" value={p.y} onChange={(e) => { const arr = [...points]; arr[i] = { ...p, y: parseFloat(e.target.value) || 0 }; onChange({ points: arr }); }} className="w-14 text-xs px-1 py-0.5 border border-slate-300 rounded" step="0.1" title="y" />
              <button type="button" onClick={() => onChange({ points: points.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
