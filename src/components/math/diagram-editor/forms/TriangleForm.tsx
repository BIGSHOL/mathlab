'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps, Point2DInput } from '../types';
import { BoolField, ShapeStyleFields, NumInput } from '../SharedControls';

const TRI_VERTEX_BADGES = ['①', '②', '③'];
const TRI_PRESETS: Record<string, (dims: { base: number; height: number; apexOffset: number }) => Point2DInput[]> = {
  right: ({ base, height }) => [
    { x: 0, y: 0, label: 'A' },
    { x: 0, y: height, label: 'B' },
    { x: base, y: height, label: 'C' },
  ],
  equilateral: ({ base }) => [
    { x: base / 2, y: 0, label: 'A' },
    { x: 0, y: (base * Math.sqrt(3)) / 2, label: 'B' },
    { x: base, y: (base * Math.sqrt(3)) / 2, label: 'C' },
  ],
  isosceles: ({ base, height }) => [
    { x: base / 2, y: 0, label: 'A' },
    { x: 0, y: height, label: 'B' },
    { x: base, y: height, label: 'C' },
  ],
  scalene: ({ base, height, apexOffset }) => [
    { x: Math.max(0, Math.min(base, apexOffset)), y: 0, label: 'A' },
    { x: 0, y: height, label: 'B' },
    { x: base, y: height, label: 'C' },
  ],
};

function extractTriDimensions(verts: Point2DInput[]): { base: number; height: number; apexOffset: number } {
  if (!verts || verts.length < 3) return { base: 180, height: 140, apexOffset: 90 };
  const xs = verts.map(v => v.x);
  const ys = verts.map(v => v.y);
  const base = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const topVert = verts.reduce((min, v) => v.y < min.y ? v : min, verts[0]);
  const apexOffset = topVert.x - Math.min(...xs);
  return { base: Math.max(20, base), height: Math.max(20, height), apexOffset };
}

export function TriangleForm({ params, onChange }: SubFormProps) {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [preset, setPreset] = useState<'right' | 'equilateral' | 'isosceles' | 'scalene'>('isosceles');
  const vertices = Array.isArray(params.vertices) ? params.vertices as Point2DInput[] : [{ x: 100, y: 10, label: 'A' }, { x: 10, y: 150, label: 'B' }, { x: 190, y: 150, label: 'C' }];
  const sides = Array.isArray(params.sides) ? params.sides as { from: number; to: number; label: string; curve?: boolean | Record<string, unknown> }[] : [];
  const angles = Array.isArray(params.angles) ? params.angles as { vertex: number; value: string }[] : [];
  const dims = extractTriDimensions(vertices);

  const regenTriangle = (nextPreset: typeof preset, patch: Partial<typeof dims> = {}) => {
    const next = { ...dims, ...patch };
    const verts = TRI_PRESETS[nextPreset](next);
    onChange({ vertices: verts });
  };

  return (
    <div className="space-y-2">
      {/* 모드 토글 */}
      <div className="flex gap-1">
        <button type="button" onClick={() => setMode('simple')} className={`text-xs px-2 py-0.5 rounded ${mode === 'simple' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          치수 입력
        </button>
        <button type="button" onClick={() => setMode('advanced')} className={`text-xs px-2 py-0.5 rounded ${mode === 'advanced' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          꼭짓점 직접 편집
        </button>
      </div>

      {mode === 'simple' ? (
        <div className="space-y-1.5 bg-slate-50 rounded p-2">
          <div>
            <label className="text-xs text-slate-600">종류</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {[
                { k: 'right', label: '직각삼각형' },
                { k: 'equilateral', label: '정삼각형' },
                { k: 'isosceles', label: '이등변삼각형' },
                { k: 'scalene', label: '일반삼각형' },
              ].map(({ k, label }) => (
                <button key={k} type="button" onClick={() => { setPreset(k as typeof preset); regenTriangle(k as typeof preset); }} className={`text-xs px-2 py-0.5 rounded border ${preset === k ? 'bg-primary text-white border-primary' : 'bg-white border-slate-300 hover:border-primary'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <label className="text-xs text-slate-600 w-14">밑변</label>
            <NumInput min={20} max={400} value={Math.round(dims.base)} onChange={(v) => regenTriangle(preset, { base: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
            <span className="text-xs text-slate-400">px</span>
          </div>
          {preset !== 'equilateral' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 w-14">높이</label>
              <NumInput min={20} max={400} value={Math.round(dims.height)} onChange={(v) => regenTriangle(preset, { height: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
              <span className="text-xs text-slate-400">px</span>
            </div>
          )}
          {preset === 'scalene' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 w-14">꼭지 기울기</label>
              <NumInput min={0} max={400} value={Math.round(dims.apexOffset)} onChange={(v) => regenTriangle(preset, { apexOffset: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
              <span className="text-xs text-slate-400">px (좌에서)</span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 pt-1">💡 치수를 바꾸면 꼭짓점이 자동 재배치됩니다</p>
        </div>
      ) : (
        (() => {
          const bboxMaxY = Math.max(0, ...vertices.map(v => v.y));
          return (
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <label className="text-xs text-slate-500 shrink-0">꼭짓점 (x, y, 라벨)</label>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">원점(0,0) = 좌하단 · y↑</span>
              </div>
              {vertices.map((v, i) => {
                const displayY = Math.round((bboxMaxY - v.y) * 100) / 100;
                return (
                  <div key={i} className="flex gap-1 items-center">
                    <span className="shrink-0 w-6 text-xs text-slate-500 tabular-nums">{TRI_VERTEX_BADGES[i]}</span>
                    <NumInput value={v.x} onChange={(nx) => { const arr = [...vertices]; arr[i] = { ...v, x: nx }; onChange({ vertices: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="x" />
                    <NumInput value={displayY} onChange={(userY) => { const arr = [...vertices]; arr[i] = { ...v, y: bboxMaxY - userY }; onChange({ vertices: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="y" />
                    <input type="text" value={v.label || ''} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, label: e.target.value }; onChange({ vertices: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨(예: A)" />
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
      {/* 변 라벨 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">변 라벨</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ sides: [...sides, { from: 0, to: 1, label: '' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {sides.map((s, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <NumInput value={s.from} min={0} max={2} onChange={(v) => { const arr = [...sides]; arr[i] = { ...s, from: v }; onChange({ sides: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <span className="text-xs text-slate-400">&ndash;</span>
            <NumInput value={s.to} min={0} max={2} onChange={(v) => { const arr = [...sides]; arr[i] = { ...s, to: v }; onChange({ sides: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <input type="text" value={s.label} onChange={(e) => { const arr = [...sides]; arr[i] = { ...s, label: e.target.value }; onChange({ sides: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="a, b, 5, x+1 등 (변수 italic 자동)" title="숫자 또는 변수/수식. $...$ 로 명시적 KaTeX도 가능" />
            <label className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap cursor-pointer" title="변을 감싸는 점선 호(측정 표기법) 표시">
              <input type="checkbox" checked={!!s.curve} onChange={(e) => { const arr = [...sides]; arr[i] = { ...s, curve: e.target.checked || undefined }; onChange({ sides: arr }); }} className="w-3 h-3" />
              호
            </label>
            <button type="button" onClick={() => onChange({ sides: sides.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 각도 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">각도 라벨</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ angles: [...angles, { vertex: 0, value: '' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {angles.map((a, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <NumInput value={a.vertex} min={0} max={2} onChange={(v) => { const arr = [...angles]; arr[i] = { ...a, vertex: v }; onChange({ angles: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 인덱스" />
            <input type="text" value={a.value} onChange={(e) => { const arr = [...angles]; arr[i] = { ...a, value: e.target.value }; onChange({ angles: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="예: 60°" />
            <button type="button" onClick={() => onChange({ angles: angles.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 특수점 */}
      <div>
        <label className="text-xs text-slate-500">특수점</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {(['incenter', 'circumcenter', 'centroid', 'orthocenter'] as const).map((sp) => {
            const spLabels = { incenter: '내심(I)', circumcenter: '외심(O)', centroid: '무게중심(G)', orthocenter: '수심(H)' };
            const current = Array.isArray(params.specialPoints) ? params.specialPoints as string[] : [];
            const checked = current.includes(sp);
            return (
              <label key={sp} className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => {
                  const next = e.target.checked ? [...current, sp] : current.filter(s => s !== sp);
                  onChange({ specialPoints: next.length > 0 ? next : undefined });
                }} className="rounded w-3 h-3" />
                {spLabels[sp]}
              </label>
            );
          })}
        </div>
      </div>
      {/* 보조선 */}
      <div>
        <label className="text-xs text-slate-500">보조선</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {(['medians', 'altitudes', 'angle_bisectors', 'perpendicular_bisectors'] as const).map((al) => {
            const alLabels = { medians: '중선', altitudes: '수선', angle_bisectors: '이등분선', perpendicular_bisectors: '수직이등분선' };
            const current = Array.isArray(params.auxiliaryLines) ? params.auxiliaryLines as string[] : [];
            const checked = current.includes(al);
            return (
              <label key={al} className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => {
                  const next = e.target.checked ? [...current, al] : current.filter(s => s !== al);
                  onChange({ auxiliaryLines: next.length > 0 ? next : undefined });
                }} className="rounded w-3 h-3" />
                {alLabels[al]}
              </label>
            );
          })}
        </div>
      </div>
      {/* 내/외접원 */}
      <div className="flex gap-4">
        <BoolField label="내접원" value={!!params.inscribedCircle} onChange={(v) => onChange({ inscribedCircle: v || undefined })} />
        <BoolField label="외접원" value={!!params.circumscribedCircle} onChange={(v) => onChange({ circumscribedCircle: v || undefined })} />
      </div>
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}
