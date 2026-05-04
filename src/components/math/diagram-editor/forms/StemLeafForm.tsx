'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps } from '../types';
import { TextField } from '../SharedControls';

export function StemLeafForm({ params, onChange }: SubFormProps) {
  const stems = Array.isArray(params.stems) ? (params.stems as { stem: number; leaves: number[] }[]) : [];
  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">줄기 / 잎</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ stems: [...stems, { stem: 0, leaves: [] }] })}><Plus className="w-3 h-3 inline" /> 추가</button>
        </div>
        {stems.map((s, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={s.stem} min={0} onChange={(e) => { const arr = [...stems]; const n = parseInt(e.target.value); arr[i] = { ...s, stem: Math.max(0, isNaN(n) ? 0 : n) }; onChange({ stems: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="줄기" />
            <span className="text-xs text-slate-400">|</span>
            <input type="text" value={Array.isArray(s.leaves) ? s.leaves.join(', ') : ''} onChange={(e) => { const arr = [...stems]; arr[i] = { ...s, leaves: e.target.value.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)) }; onChange({ stems: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="잎 (쉼표 구분)" />
            <button type="button" onClick={() => onChange({ stems: stems.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
