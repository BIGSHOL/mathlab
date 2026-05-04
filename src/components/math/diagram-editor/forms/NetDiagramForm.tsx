'use client';

import type { SubFormProps } from '../types';
import { BoolField, ColorSelect } from '../SharedControls';

const NET_SHAPES = [
  { value: 'cube', label: '정육면체' },
  { value: 'rectangular_prism', label: '직육면체' },
  { value: 'cylinder', label: '원기둥' },
  { value: 'cone', label: '원뿔' },
  { value: 'triangular_prism', label: '삼각기둥' },
  { value: 'pyramid', label: '사각뿔' },
];

export function NetDiagramForm({ params, onChange }: SubFormProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-slate-500">도형</label>
        <select value={String(params.shape || 'cube')} onChange={(e) => onChange({ shape: e.target.value })} className="block w-full text-sm px-2 py-1 border border-slate-300 rounded">
          {NET_SHAPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <BoolField label="접는 선 표시" value={params.foldLines !== false} onChange={(v) => onChange({ foldLines: v })} />
      <ColorSelect value={String(params.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
    </div>
  );
}
