'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps } from '../types';
import { TextField, BoolField, ColorSelect } from '../SharedControls';

export function HistogramForm({ params, onChange }: SubFormProps) {
  const bins = Array.isArray(params.bins) ? (params.bins as { range: [number, number]; frequency: number }[]) : [];
  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <TextField label="X축 라벨" value={String(params.xLabel || '')} onChange={(v) => onChange({ xLabel: v })} />
      <TextField label="Y축 라벨" value={String(params.yLabel || '')} onChange={(v) => onChange({ yLabel: v })} placeholder="도수(명)" />
      <BoolField label="도수분포다각형" value={!!params.showFrequencyPolygon} onChange={(v) => onChange({ showFrequencyPolygon: v })} />
      <ColorSelect value={String(params.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">계급</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => {
            const last = bins.length > 0 ? bins[bins.length - 1] : null;
            const newLo = last ? last.range[1] : 0;
            onChange({ bins: [...bins, { range: [newLo, newLo + 10], frequency: 0 }] });
          }}><Plus className="w-3 h-3 inline" /> 추가</button>
        </div>
        {bins.map((b, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={b.range[0]} onChange={(e) => { const arr = [...bins]; arr[i] = { ...b, range: [parseFloat(e.target.value) || 0, b.range[1]] }; onChange({ bins: arr }); }} className="w-14 text-xs px-1 py-0.5 border border-slate-300 rounded" title="시작" />
            <span className="text-xs text-slate-400">~</span>
            <input type="number" value={b.range[1]} onChange={(e) => { const arr = [...bins]; arr[i] = { ...b, range: [b.range[0], parseFloat(e.target.value) || 0] }; onChange({ bins: arr }); }} className="w-14 text-xs px-1 py-0.5 border border-slate-300 rounded" title="끝" />
            <span className="text-xs text-slate-400">도수:</span>
            <input type="number" value={b.frequency} min={0} onChange={(e) => { const arr = [...bins]; const n = parseInt(e.target.value); arr[i] = { ...b, frequency: Math.max(0, isNaN(n) ? 0 : n) }; onChange({ bins: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <button type="button" onClick={() => onChange({ bins: bins.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
