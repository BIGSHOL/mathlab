'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps } from '../types';
import { NumField, TextField, ShapeStyleFields, NumInput } from '../SharedControls';

export function RegularPolygonForm({ params, onChange }: SubFormProps) {
  const nSides = Number(params.sides) || 5;
  const diagonals = params.diagonals;
  const isAllDiags = diagonals === true;
  const diagArray = Array.isArray(diagonals) ? diagonals as { from: number; to: number; style?: 'solid' | 'dashed' }[] : [];
  const mode = isAllDiags ? 'all' : Array.isArray(diagonals) ? 'custom' : 'none';

  return (
    <div className="space-y-2">
      <NumField label="변의 수" value={nSides} onChange={(v) => onChange({ sides: v })} min={3} max={12} />
      {/* 대각선 모드 */}
      <div>
        <label className="text-xs text-slate-500">대각선</label>
        <div className="flex gap-1.5 mt-1">
          {[
            { value: 'none', label: '없음' },
            { value: 'all', label: '전체 (점선)' },
            { value: 'custom', label: '개별 지정' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (opt.value === 'none') onChange({ diagonals: false });
                else if (opt.value === 'all') onChange({ diagonals: true });
                else onChange({ diagonals: [] });
              }}
              className={`px-2 py-0.5 text-xs border rounded transition-colors ${mode === opt.value ? 'bg-primary text-white border-primary' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {mode === 'custom' && (
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-500">대각선 목록</label>
            <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ diagonals: [...diagArray, { from: 0, to: 2, style: 'solid' }] })}>
              <Plus className="w-3 h-3 inline" /> 추가
            </button>
          </div>
          {diagArray.map((d, i) => (
            <div key={i} className="flex gap-1 mt-1 items-center">
              <input type="number" value={d.from} min={0} max={nSides - 1} onChange={(e) => { const arr = [...diagArray]; const n = parseInt(e.target.value); arr[i] = { ...d, from: Math.max(0, Math.min(nSides - 1, isNaN(n) ? 0 : n)) }; onChange({ diagonals: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 시작" />
              <span className="text-xs text-slate-400">&ndash;</span>
              <input type="number" value={d.to} min={0} max={nSides - 1} onChange={(e) => { const arr = [...diagArray]; const n = parseInt(e.target.value); arr[i] = { ...d, to: Math.max(0, Math.min(nSides - 1, isNaN(n) ? 0 : n)) }; onChange({ diagonals: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 끝" />
              <select value={d.style || 'solid'} onChange={(e) => { const arr = [...diagArray]; arr[i] = { ...d, style: e.target.value as 'solid' | 'dashed' }; onChange({ diagonals: arr }); }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
                <option value="solid">실선</option>
                <option value="dashed">점선</option>
              </select>
              <button type="button" onClick={() => onChange({ diagonals: diagArray.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          <p className="text-xs text-slate-400 mt-1">꼭짓점 번호: 0 (상단) ~ {nSides - 1} (시계방향)</p>
        </div>
      )}

      {/* 각도(내각/외각) 목록 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">각도 표시</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => {
            const arr = Array.isArray(params.angles) ? [...(params.angles as any[])] : [];
            onChange({ angles: [...arr, { vertex: 0, exterior: false, text: '' }] });
          }}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {Array.isArray(params.angles) && (params.angles as any[]).map((ang: any, i: number) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={ang.vertex} min={0} max={nSides - 1} onChange={(e) => {
              const arr = [...(params.angles as any[])]; const n = parseInt(e.target.value); arr[i] = { ...ang, vertex: Math.max(0, Math.min(nSides - 1, isNaN(n) ? 0 : n)) }; onChange({ angles: arr });
            }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 번호" />
            <select value={ang.exterior ? 'exterior' : 'interior'} onChange={(e) => {
              const arr = [...(params.angles as any[])]; arr[i] = { ...ang, exterior: e.target.value === 'exterior' }; onChange({ angles: arr });
            }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
              <option value="interior">내각</option>
              <option value="exterior">외각</option>
            </select>
            <input type="text" value={ang.text || ''} placeholder="각도(라벨)" onChange={(e) => {
              const arr = [...(params.angles as any[])]; arr[i] = { ...ang, text: e.target.value }; onChange({ angles: arr });
            }} className="flex-1 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <button type="button" onClick={() => onChange({ angles: (params.angles as any[]).filter((_: any, j: number) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 변 라벨 + 호 토글 */}
      {(() => {
        const showLengths = Array.isArray(params.showLengths)
          ? (params.showLengths as { edge: [number, number]; value: string; curve?: boolean | Record<string, unknown> }[])
          : [];
        const nLocal = Number(params.sides) || 3;
        const maxIdx = Math.max(0, nLocal - 1);
        return (
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500">변 라벨 ({showLengths.length}개)</label>
              <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ showLengths: [...showLengths, { edge: [0, 1], value: '' }] })}>
                <Plus className="w-3 h-3 inline" /> 추가
              </button>
            </div>
            {showLengths.map((s, i) => (
              <div key={i} className="flex gap-1 mt-1 items-center">
                <NumInput min={0} max={maxIdx} value={s.edge[0]} onChange={(v) => { const arr = [...showLengths]; arr[i] = { ...s, edge: [v, s.edge[1]] }; onChange({ showLengths: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" title={`from (0~${maxIdx})`} />
                <span className="text-xs text-slate-400">→</span>
                <NumInput min={0} max={maxIdx} value={s.edge[1]} onChange={(v) => { const arr = [...showLengths]; arr[i] = { ...s, edge: [s.edge[0], v] }; onChange({ showLengths: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" title={`to (0~${maxIdx})`} />
                <input type="text" value={s.value} onChange={(e) => { const arr = [...showLengths]; arr[i] = { ...s, value: e.target.value }; onChange({ showLengths: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="a, b, 5, x+1 등 (변수 italic 자동)" />
                <label className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap cursor-pointer" title="변을 감싸는 점선 호(측정 표기법) 표시">
                  <input type="checkbox" checked={!!s.curve} onChange={(e) => { const arr = [...showLengths]; arr[i] = { ...s, curve: e.target.checked || undefined }; onChange({ showLengths: arr }); }} className="w-3 h-3" />
                  호
                </label>
                <button type="button" onClick={() => onChange({ showLengths: showLengths.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        );
      })()}
      <TextField label="변의 길이 (단일, 레거시)" value={String(params.sideLength || '')} onChange={(v) => onChange({ sideLength: v })} placeholder="변 라벨 배열이 있으면 무시됨" />
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}
