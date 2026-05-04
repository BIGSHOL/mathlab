'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps } from '../types';
import { LINE_COLOR_OPTIONS } from '../types';
import { NumField, ShapeStyleFields } from '../SharedControls';

export function CircleForm({ params, onChange }: SubFormProps) {
  const labels = Array.isArray(params.labels) ? params.labels as { text: string; angle: number; position?: 'outside' | 'center' }[] : [];
  const arcs = Array.isArray(params.arcs) ? params.arcs as { startAngle: number; endAngle: number; label?: string; color?: string; strokeWidth?: number }[] : [];
  const tangentLines = Array.isArray(params.tangentLines) ? params.tangentLines as { angle: number; label?: string }[] : [];
  const radiusLines = Array.isArray(params.radiusLines) ? params.radiusLines as { angle: number; label?: string }[] : [];
  const centralAngles = Array.isArray(params.centralAngles) ? params.centralAngles as { startAngle: number; endAngle: number; label?: string }[] : [];
  const inscribedAngles = Array.isArray(params.inscribedAngles) ? params.inscribedAngles as { vertexAngle: number; startAngle: number; endAngle: number; label?: string }[] : [];

  return (
    <div className="space-y-2">
      <NumField label="반지름" value={Number(params.radius) || 60} onChange={(v) => onChange({ radius: v })} min={20} max={150} />
      {/* 라벨 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">라벨</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ labels: [...labels, { text: '', angle: 0, position: 'outside' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {labels.map((l, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="text" value={l.text} onChange={(e) => { const arr = [...labels]; arr[i] = { ...l, text: e.target.value }; onChange({ labels: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="텍스트" />
            <select value={l.position || 'outside'} onChange={(e) => { const arr = [...labels]; arr[i] = { ...l, position: e.target.value as 'outside' | 'center' }; onChange({ labels: arr }); }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
              <option value="outside">바깥</option>
              <option value="center">중앙</option>
            </select>
            {(l.position || 'outside') === 'outside' && (
              <input type="number" value={l.angle} onChange={(e) => { const arr = [...labels]; arr[i] = { ...l, angle: parseFloat(e.target.value) || 0 }; onChange({ labels: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="각도°" />
            )}
            <button type="button" onClick={() => onChange({ labels: labels.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 호 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">호 (arc)</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ arcs: [...arcs, { startAngle: 0, endAngle: 90, color: '#EF4444', strokeWidth: 4 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {arcs.map((a, i) => (
          <div key={i} className="space-y-1 mt-1.5 p-1.5 bg-slate-50 rounded border border-slate-100">
            <div className="flex gap-1 items-center">
              <input type="number" value={a.startAngle} onChange={(e) => { const arr = [...arcs]; arr[i] = { ...a, startAngle: parseFloat(e.target.value) || 0 }; onChange({ arcs: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded bg-white" placeholder="시작°" />
              <span className="text-xs text-slate-400">~</span>
              <input type="number" value={a.endAngle} onChange={(e) => { const arr = [...arcs]; arr[i] = { ...a, endAngle: parseFloat(e.target.value) || 0 }; onChange({ arcs: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded bg-white" placeholder="끝°" />
              <input type="text" value={a.label || ''} onChange={(e) => { const arr = [...arcs]; arr[i] = { ...a, label: e.target.value }; onChange({ arcs: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded bg-white" placeholder="라벨" />
              <button type="button" onClick={() => onChange({ arcs: arcs.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-1.5 items-center">
              <div className="flex gap-1 items-center">
                {LINE_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => { const arr = [...arcs]; arr[i] = { ...a, color: c.value || undefined }; onChange({ arcs: arr }); }}
                    className={`w-4 h-4 rounded-full border transition-all ${(a.color || '') === c.value ? 'border-slate-800 scale-110' : 'border-slate-200'}`}
                    style={{ backgroundColor: c.value || '#333' }}
                    title={c.label}
                  />
                ))}
              </div>
              <label className="flex items-center gap-0.5 text-xs text-slate-500 ml-1 shrink-0">
                두께
                <input type="number" value={a.strokeWidth || 4} min={1} max={10} step={0.5} onChange={(e) => { const arr = [...arcs]; arr[i] = { ...a, strokeWidth: parseFloat(e.target.value) || 4 }; onChange({ arcs: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded bg-white" />
              </label>
            </div>
          </div>
        ))}
      </div>
      {/* 접선 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">접선</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ tangentLines: [...tangentLines, { angle: 90 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {tangentLines.map((t, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={t.angle} onChange={(e) => { const a = [...tangentLines]; a[i] = { ...t, angle: parseFloat(e.target.value) || 0 }; onChange({ tangentLines: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="각도°" />
            <input type="text" value={t.label || ''} onChange={(e) => { const a = [...tangentLines]; a[i] = { ...t, label: e.target.value }; onChange({ tangentLines: a }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <button type="button" onClick={() => onChange({ tangentLines: tangentLines.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 반지름선 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">반지름선</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ radiusLines: [...radiusLines, { angle: 0 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {radiusLines.map((r, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={r.angle} onChange={(e) => { const a = [...radiusLines]; a[i] = { ...r, angle: parseFloat(e.target.value) || 0 }; onChange({ radiusLines: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="각도°" />
            <input type="text" value={r.label || ''} onChange={(e) => { const a = [...radiusLines]; a[i] = { ...r, label: e.target.value }; onChange({ radiusLines: a }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <button type="button" onClick={() => onChange({ radiusLines: radiusLines.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 중심각 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">중심각</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ centralAngles: [...centralAngles, { startAngle: 0, endAngle: 60 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {centralAngles.map((ca, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={ca.startAngle} onChange={(e) => { const a = [...centralAngles]; a[i] = { ...ca, startAngle: parseFloat(e.target.value) || 0 }; onChange({ centralAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="시작°" />
            <span className="text-xs text-slate-400">~</span>
            <input type="number" value={ca.endAngle} onChange={(e) => { const a = [...centralAngles]; a[i] = { ...ca, endAngle: parseFloat(e.target.value) || 0 }; onChange({ centralAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="끝°" />
            <input type="text" value={ca.label || ''} onChange={(e) => { const a = [...centralAngles]; a[i] = { ...ca, label: e.target.value }; onChange({ centralAngles: a }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <button type="button" onClick={() => onChange({ centralAngles: centralAngles.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 원주각 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">원주각</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ inscribedAngles: [...inscribedAngles, { vertexAngle: 180, startAngle: 0, endAngle: 90 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {inscribedAngles.map((ia, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={ia.vertexAngle} onChange={(e) => { const a = [...inscribedAngles]; a[i] = { ...ia, vertexAngle: parseFloat(e.target.value) || 0 }; onChange({ inscribedAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="꼭짓점°" title="원주 위 꼭짓점 각도" />
            <input type="number" value={ia.startAngle} onChange={(e) => { const a = [...inscribedAngles]; a[i] = { ...ia, startAngle: parseFloat(e.target.value) || 0 }; onChange({ inscribedAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="시작°" />
            <input type="number" value={ia.endAngle} onChange={(e) => { const a = [...inscribedAngles]; a[i] = { ...ia, endAngle: parseFloat(e.target.value) || 0 }; onChange({ inscribedAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="끝°" />
            <button type="button" onClick={() => onChange({ inscribedAngles: inscribedAngles.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}
