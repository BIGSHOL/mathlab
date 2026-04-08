'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps } from './types';
import {
  NumField, BoolField, ColorSelect, TextField,
  CommaSplitField, CommaNumField,
} from './SharedControls';

// ── CellGrid (분수 사각형용) ──

/**
 * 셀 상태: 0=빈칸, 1=색칠, 2=빗금
 * 클릭할 때마다 0→1→2→0 순환
 */
function CellGrid({ rows, cols, count, coloredCells, hatchedCells, color, onChange }: {
  rows: number; cols: number; count: number;
  coloredCells: number[]; hatchedCells: number[];
  color: string;
  onChange: (colored: number[], hatched: number[]) => void;
}) {
  const coloredSet = new Set(coloredCells);
  const hatchedSet = new Set(hatchedCells);
  const cellsPerRect = rows * cols;

  const handleClick = (idx: number) => {
    const isColored = coloredSet.has(idx);
    const isHatched = hatchedSet.has(idx);

    const newColored = new Set(coloredSet);
    const newHatched = new Set(hatchedSet);

    if (!isColored && !isHatched) {
      newColored.add(idx);
    } else if (isColored && !isHatched) {
      newColored.delete(idx);
      newHatched.add(idx);
    } else {
      newColored.delete(idx);
      newHatched.delete(idx);
    }
    onChange([...newColored], [...newHatched]);
  };

  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">셀 클릭: 빈칸 → 색칠 → 빗금</label>
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: count }, (_, g) => (
          <div key={g} className="inline-grid border border-slate-300 rounded" style={{ gridTemplateColumns: `repeat(${cols}, 28px)` }}>
            {Array.from({ length: cellsPerRect }, (_, localIdx) => {
              const idx = g * cellsPerRect + localIdx;
              const isColored = coloredSet.has(idx);
              const isHatched = hatchedSet.has(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleClick(idx)}
                  className="w-7 h-7 border border-slate-200 relative overflow-hidden transition-colors"
                  style={{ backgroundColor: isColored ? color + '55' : 'white' }}
                  title={`사각형${g + 1} 셀${localIdx}: ${isHatched ? '빗금' : isColored ? '색칠' : '빈칸'}`}
                >
                  {isHatched && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 28 28">
                      <line x1="0" y1="7" x2="7" y2="0" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
                      <line x1="0" y1="14" x2="14" y2="0" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
                      <line x1="0" y1="21" x2="21" y2="0" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
                      <line x1="0" y1="28" x2="28" y2="0" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
                      <line x1="7" y1="28" x2="28" y2="7" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
                      <line x1="14" y1="28" x2="28" y2="14" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
                      <line x1="21" y1="28" x2="28" y2="21" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SliceGrid (분수 원용) ──

function SliceGrid({ totalParts, count, coloredSlices, hatchedSlices, color, onChange }: {
  totalParts: number; count: number;
  coloredSlices: number[]; hatchedSlices: number[];
  color: string;
  onChange: (colored: number[], hatched: number[]) => void;
}) {
  const coloredSet = new Set(coloredSlices);
  const hatchedSet = new Set(hatchedSlices);

  const handleClick = (idx: number) => {
    const isColored = coloredSet.has(idx);
    const isHatched = hatchedSet.has(idx);
    const newColored = new Set(coloredSet);
    const newHatched = new Set(hatchedSet);

    if (!isColored && !isHatched) {
      newColored.add(idx);
    } else if (isColored && !isHatched) {
      newColored.delete(idx);
      newHatched.add(idx);
    } else {
      newColored.delete(idx);
      newHatched.delete(idx);
    }
    onChange([...newColored], [...newHatched]);
  };

  const r = 28;
  const diameter = r * 2;

  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">조각 클릭: 빈칸 → 색칠 → 빗금</label>
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: count }, (_, g) => (
          <svg key={g} width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`} className="cursor-pointer">
            <defs>
              <pattern id={`slice-hatch-${g}`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
              </pattern>
            </defs>
            {/* 배경 원 */}
            <circle cx={r} cy={r} r={r - 1} fill="white" stroke="#ccc" strokeWidth="1" />
            {/* 파이 조각 */}
            {Array.from({ length: totalParts }, (_, i) => {
              const idx = g * totalParts + i;
              const isColored = coloredSet.has(idx);
              const isHatched = hatchedSet.has(idx);
              const angleStep = (2 * Math.PI) / totalParts;
              const startAngle = -Math.PI / 2 + i * angleStep;
              const endAngle = startAngle + angleStep;
              const x1 = r + (r - 1) * Math.cos(startAngle);
              const y1 = r + (r - 1) * Math.sin(startAngle);
              const x2 = r + (r - 1) * Math.cos(endAngle);
              const y2 = r + (r - 1) * Math.sin(endAngle);
              const largeArc = angleStep > Math.PI ? 1 : 0;
              const d = totalParts === 1
                ? `M ${r - (r - 1)},${r} A ${r - 1},${r - 1} 0 1,1 ${r - (r - 1)},${r + 0.01} Z`
                : `M ${r} ${r} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r - 1} ${r - 1} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

              return (
                <g key={i} onClick={() => handleClick(idx)}>
                  <path
                    d={d}
                    fill={isColored ? color : isHatched ? 'white' : 'transparent'}
                    fillOpacity={isColored ? 0.35 : 1}
                    stroke="none"
                    className="cursor-pointer hover:opacity-70"
                  />
                  {isHatched && (
                    <path d={d} fill={`url(#slice-hatch-${g})`} stroke="none" className="pointer-events-none" />
                  )}
                </g>
              );
            })}
            {/* 분할선 */}
            {totalParts > 1 && Array.from({ length: totalParts }, (_, i) => {
              const angle = -Math.PI / 2 + i * (2 * Math.PI / totalParts);
              return (
                <line key={`l${i}`} x1={r} y1={r} x2={(r + (r - 1) * Math.cos(angle)).toFixed(2)} y2={(r + (r - 1) * Math.sin(angle)).toFixed(2)} stroke="#aaa" strokeWidth="0.8" className="pointer-events-none" />
              );
            })}
            <circle cx={r} cy={r} r={r - 1} fill="none" stroke="#999" strokeWidth="1" className="pointer-events-none" />
          </svg>
        ))}
      </div>
    </div>
  );
}

// ── 초등 서브폼들 ──

export function FractionRectForm({ params, onChange }: SubFormProps) {
  const p = params;
  const rows = Number(p.rows) || 1;
  const cols = Number(p.cols) || 1;
  const totalCells = rows * cols;
  const coloredCells = Array.isArray(p.coloredCells) ? p.coloredCells as number[] : [];
  const hatchedCells = Array.isArray(p.hatchedCells) ? p.hatchedCells as number[] : [];
  // coloredCount 모드: coloredCells가 비어있고 coloredCount가 설정된 경우
  const useCountMode = p.coloredCount !== undefined && p.coloredCount !== null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <NumField label="행 수" value={rows} onChange={(v) => onChange({ rows: v, coloredCells: [], hatchedCells: [], coloredCount: undefined })} min={1} max={10} />
        <NumField label="열 수" value={cols} onChange={(v) => onChange({ cols: v, coloredCells: [], hatchedCells: [], coloredCount: undefined })} min={1} max={20} />
        <NumField label="사각형 개수" value={Number(p.count) || 1} onChange={(v) => onChange({ count: v })} min={1} max={10} />
      </div>
      <NumField label="색칠할 개수 (앞에서부터)" value={Number(p.coloredCount) || 0} onChange={(v) => onChange({ coloredCount: v > 0 ? v : undefined, coloredCells: [] })} min={0} max={totalCells} />
      <BoolField label="빗금 처리" value={!!p.hatching} onChange={(v) => onChange({ hatching: v })} />
      {!useCountMode && (
        <>
          <div className="text-xs text-slate-400 mt-1">또는 셀 클릭으로 개별 지정:</div>
          <CellGrid
            rows={rows}
            cols={cols}
            count={Number(p.count) || 1}
            coloredCells={coloredCells}
            hatchedCells={hatchedCells}
            color={String(p.color || '#3B82F6')}
            onChange={(colored, hatched) => onChange({ coloredCells: colored, hatchedCells: hatched, coloredCount: undefined, hatching: false })}
          />
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border border-slate-300 bg-white" /> 빈칸</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border border-slate-300" style={{ backgroundColor: String(p.color || '#3B82F6') + '55' }} /> 색칠</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border border-slate-300 bg-white relative overflow-hidden"><svg className="absolute inset-0" viewBox="0 0 12 12"><line x1="0" y1="4" x2="4" y2="0" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /><line x1="0" y1="8" x2="8" y2="0" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /><line x1="0" y1="12" x2="12" y2="0" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /><line x1="4" y1="12" x2="12" y2="4" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /><line x1="8" y1="12" x2="12" y2="8" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /></svg></span> 빗금</span>
          </div>
        </>
      )}
      <ColorSelect value={String(p.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
    </div>
  );
}

export function FractionCircleForm({ params, onChange }: SubFormProps) {
  const p = params;
  const totalParts = Number(p.totalParts) || 1;
  const count = Number(p.count) || 1;
  const coloredSlices = Array.isArray(p.coloredSlices) ? p.coloredSlices as number[] : [];
  const hatchedSlices = Array.isArray(p.hatchedSlices) ? p.hatchedSlices as number[] : [];
  const useCountMode = (p.coloredSlices === undefined || (Array.isArray(p.coloredSlices) && p.coloredSlices.length === 0)) && (Number(p.coloredParts) || 0) > 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <NumField label="등분 수" value={totalParts} onChange={(v) => onChange({ totalParts: v, coloredSlices: [], hatchedSlices: [], coloredParts: 0 })} min={1} max={20} />
        <NumField label="색칠 수 (앞에서)" value={Number(p.coloredParts) || 0} onChange={(v) => onChange({ coloredParts: v, coloredSlices: [] })} min={0} max={totalParts} />
        <NumField label="원 개수" value={count} onChange={(v) => onChange({ count: v })} min={1} max={10} />
      </div>
      <BoolField label="빗금 처리" value={!!p.hatching} onChange={(v) => onChange({ hatching: v })} />
      {!useCountMode && (
        <>
          <div className="text-xs text-slate-400 mt-1">또는 조각 클릭으로 개별 지정:</div>
          <SliceGrid
            totalParts={totalParts}
            count={count}
            coloredSlices={coloredSlices}
            hatchedSlices={hatchedSlices}
            color={String(p.color || '#3B82F6')}
            onChange={(colored, hatched) => onChange({ coloredSlices: colored, hatchedSlices: hatched, coloredParts: 0, hatching: false })}
          />
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full border border-slate-300 bg-white" /> 빈칸</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: String(p.color || '#3B82F6') + '55' }} /> 색칠</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full border border-slate-300 bg-white relative overflow-hidden"><svg className="absolute inset-0" viewBox="0 0 12 12"><line x1="0" y1="4" x2="4" y2="0" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /><line x1="0" y1="8" x2="8" y2="0" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /><line x1="0" y1="12" x2="12" y2="0" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /><line x1="4" y1="12" x2="12" y2="4" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /><line x1="8" y1="12" x2="12" y2="8" stroke={String(p.color || '#3B82F6')} strokeWidth="1" /></svg></span> 빗금</span>
          </div>
        </>
      )}
      <ColorSelect value={String(p.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
    </div>
  );
}

export function NumberLineForm({ params, onChange }: SubFormProps) {
  const p = params;
  const marks = Array.isArray(p.marks) ? p.marks as { value: number; label?: string; color?: string; showDot?: boolean }[] : [];
  const highlights = Array.isArray(p.highlights) ? p.highlights as { from: number; to: number; label?: string; color?: string; dashed?: boolean }[] : [];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <NumField label="최솟값" value={Number(p.min) || 0} onChange={(v) => onChange({ min: v })} step={0.1} />
        <NumField label="최댓값" value={Number(p.max) || 1} onChange={(v) => onChange({ max: v })} step={0.1} />
        <NumField label="눈금 간격" value={Number(p.step) || 0.1} onChange={(v) => onChange({ step: v })} step={0.01} min={0.01} />
      </div>
      <BoolField label="모든 눈금에 숫자 표시" value={!!p.showAllTickLabels} onChange={(v) => onChange({ showAllTickLabels: v })} />
      {/* 마크 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">눈금 표시 (marks) — 숫자 라벨이 표시됨</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ marks: [...marks, { value: 0 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {marks.map((m, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center flex-wrap">
            <input type="number" value={m.value} step={0.1} onChange={(e) => { const arr = [...marks]; arr[i] = { ...m, value: parseFloat(e.target.value) || 0 }; onChange({ marks: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="값" />
            <input type="text" value={m.label || ''} onChange={(e) => { const arr = [...marks]; arr[i] = { ...m, label: e.target.value }; onChange({ marks: arr }); }} className="w-20 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <select value={m.color || '#EF4444'} onChange={(e) => { const arr = [...marks]; arr[i] = { ...m, color: e.target.value }; onChange({ marks: arr }); }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
              <option value="#EF4444">빨강</option>
              <option value="#3B82F6">파랑</option>
              <option value="#10B981">초록</option>
              <option value="#F97316">주황</option>
              <option value="#7C3AED">보라</option>
              <option value="#333">검정</option>
            </select>
            <label className="flex items-center gap-0.5 text-xs text-slate-500 cursor-pointer shrink-0" title="점 표시">
              <input type="checkbox" checked={m.showDot !== false} onChange={(e) => { const arr = [...marks]; arr[i] = { ...m, showDot: e.target.checked }; onChange({ marks: arr }); }} className="rounded w-3 h-3" />
              점
            </label>
            <button type="button" onClick={() => onChange({ marks: marks.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 하이라이트 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">하이라이트 (호)</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ highlights: [...highlights, { from: 0, to: 1, color: '#333' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {highlights.map((h, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center flex-wrap">
            <input type="number" value={h.from} step={0.1} onChange={(e) => { const arr = [...highlights]; arr[i] = { ...h, from: parseFloat(e.target.value) || 0 }; onChange({ highlights: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="시작" />
            <span className="text-xs text-slate-400">~</span>
            <input type="number" value={h.to} step={0.1} onChange={(e) => { const arr = [...highlights]; arr[i] = { ...h, to: parseFloat(e.target.value) || 0 }; onChange({ highlights: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="끝" />
            <input type="text" value={h.label || ''} onChange={(e) => { const arr = [...highlights]; arr[i] = { ...h, label: e.target.value }; onChange({ highlights: arr }); }} className="w-20 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <select value={h.color || '#333'} onChange={(e) => { const arr = [...highlights]; arr[i] = { ...h, color: e.target.value }; onChange({ highlights: arr }); }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
              <option value="#333">검정</option>
              <option value="#3B82F6">파랑</option>
              <option value="#EF4444">빨강</option>
              <option value="#10B981">초록</option>
              <option value="#F97316">주황</option>
              <option value="#7C3AED">보라</option>
            </select>
            <label className="flex items-center gap-0.5 text-xs text-slate-500 cursor-pointer shrink-0" title="점선">
              <input type="checkbox" checked={!!h.dashed} onChange={(e) => { const arr = [...highlights]; arr[i] = { ...h, dashed: e.target.checked }; onChange({ highlights: arr }); }} className="rounded w-3 h-3" />
              점선
            </label>
            <button type="button" onClick={() => onChange({ highlights: highlights.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlaceValueForm({ params, onChange }: SubFormProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <NumField label="백의 자리" value={Number(params.hundreds) || 0} onChange={(v) => onChange({ hundreds: v })} min={0} max={9} />
      <NumField label="십의 자리" value={Number(params.tens) || 0} onChange={(v) => onChange({ tens: v })} min={0} max={9} />
      <NumField label="일의 자리" value={Number(params.ones) || 0} onChange={(v) => onChange({ ones: v })} min={0} max={9} />
    </div>
  );
}

export function DotArrayForm({ params, onChange }: SubFormProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <NumField label="행 수" value={Number(params.rows) || 1} onChange={(v) => onChange({ rows: v })} min={1} max={10} />
        <NumField label="열 수" value={Number(params.cols) || 1} onChange={(v) => onChange({ cols: v })} min={1} max={10} />
      </div>
      <TextField label="기호" value={String(params.symbol || '●')} onChange={(v) => onChange({ symbol: v })} placeholder="●" />
    </div>
  );
}

export function FlowChartForm({ params, onChange }: SubFormProps) {
  const nodes = Array.isArray(params.nodes) ? params.nodes as { id: string; text: string; x?: number; y?: number }[] : [];
  const arrows = Array.isArray(params.arrows) ? params.arrows as { from: string; to: string; label?: string }[] : [];

  // 레이아웃 프리셋 적용
  const applyLayout = (dir: 'down' | 'right' | 'grid') => {
    const updated = nodes.map((n, i) => {
      if (dir === 'down') return { ...n, x: 0, y: i * 60 };
      if (dir === 'right') return { ...n, x: i * 120, y: 0 };
      // grid: 2열
      const col = i % 2;
      const row = Math.floor(i / 2);
      return { ...n, x: col * 120, y: row * 60 };
    });
    onChange({ nodes: updated });
  };

  return (
    <div className="space-y-2">
      {/* 레이아웃 프리셋 */}
      <div>
        <label className="text-xs text-slate-500">배치</label>
        <div className="flex gap-1.5 mt-1">
          <button type="button" onClick={() => applyLayout('down')} className="px-2 py-0.5 text-xs border border-slate-200 rounded hover:bg-slate-50">↓ 세로</button>
          <button type="button" onClick={() => applyLayout('right')} className="px-2 py-0.5 text-xs border border-slate-200 rounded hover:bg-slate-50">→ 가로</button>
          <button type="button" onClick={() => applyLayout('grid')} className="px-2 py-0.5 text-xs border border-slate-200 rounded hover:bg-slate-50">▦ 격자</button>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">노드</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => {
            const idx = nodes.length;
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            onChange({ nodes: [...nodes, { id: `n${idx}`, text: '', x: col * 120, y: row * 60 }] });
          }}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {nodes.map((n, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <span className="text-xs text-slate-400 w-6 shrink-0">{n.id}</span>
            <input type="text" value={n.text} onChange={(e) => { const arr = [...nodes]; arr[i] = { ...n, text: e.target.value }; onChange({ nodes: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="텍스트" />
            <input type="number" value={n.x ?? 0} step={10} onChange={(e) => { const arr = [...nodes]; arr[i] = { ...n, x: parseInt(e.target.value) || 0 }; onChange({ nodes: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="X" />
            <input type="number" value={n.y ?? i * 60} step={10} onChange={(e) => { const arr = [...nodes]; arr[i] = { ...n, y: parseInt(e.target.value) || 0 }; onChange({ nodes: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="Y" />
            <button type="button" onClick={() => { onChange({ nodes: nodes.filter((_, j) => j !== i), arrows: arrows.filter(a => a.from !== n.id && a.to !== n.id) }); }} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">화살표</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => { const ids = nodes.map(n => n.id); if (ids.length >= 2) onChange({ arrows: [...arrows, { from: ids[0], to: ids[1] }] }); }}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {arrows.map((a, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <select value={a.from} onChange={(e) => { const arr = [...arrows]; arr[i] = { ...a, from: e.target.value }; onChange({ arrows: arr }); }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
              {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
            </select>
            <span className="text-xs text-slate-400">&rarr;</span>
            <select value={a.to} onChange={(e) => { const arr = [...arrows]; arr[i] = { ...a, to: e.target.value }; onChange({ arrows: arr }); }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
              {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
            </select>
            <input type="text" value={a.label || ''} onChange={(e) => { const arr = [...arrows]; arr[i] = { ...a, label: e.target.value }; onChange({ arrows: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <button type="button" onClick={() => onChange({ arrows: arrows.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChartForm({ params, onChange }: SubFormProps) {
  const categories = Array.isArray(params.categories) ? (params.categories as string[]) : [];
  const values = Array.isArray(params.values) ? (params.values as number[]) : [];
  return (
    <div className="space-y-2">
      <CommaSplitField label="범주 (쉼표 구분)" value={categories} onChange={(v) => onChange({ categories: v })} placeholder="사과, 배, 감" />
      <CommaNumField label="값 (쉼표 구분)" value={values} onChange={(v) => onChange({ values: v })} placeholder="5, 3, 7" />
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} placeholder="좋아하는 과일" />
      <TextField label="Y축 라벨" value={String(params.yLabel || '')} onChange={(v) => onChange({ yLabel: v })} placeholder="학생 수(명)" />
      <ColorSelect value={String(params.barColor || '#3B82F6')} onChange={(v) => onChange({ barColor: v })} />
      <BoolField label="가로 막대" value={!!params.horizontal} onChange={(v) => onChange({ horizontal: v })} />
      <NumField label="Y축 최대" value={Number(params.yMax) || 0} onChange={(v) => onChange({ yMax: v || undefined })} min={0} />
      <NumField label="Y축 간격" value={Number(params.yStep) || 0} onChange={(v) => onChange({ yStep: v || undefined })} min={0} />
    </div>
  );
}

export function LineGraphForm({ params, onChange }: SubFormProps) {
  const categories = Array.isArray(params.categories) ? (params.categories as string[]) : [];
  const datasets = Array.isArray(params.datasets) ? (params.datasets as { values: number[]; label?: string; color?: string }[]) : [];
  return (
    <div className="space-y-2">
      <CommaSplitField label="범주 (쉼표 구분)" value={categories} onChange={(v) => onChange({ categories: v })} placeholder="1월, 2월, 3월" />
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <TextField label="Y축 라벨" value={String(params.yLabel || '')} onChange={(v) => onChange({ yLabel: v })} />
      <BoolField label="점 표시" value={params.showDots !== false} onChange={(v) => onChange({ showDots: v })} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">데이터셋</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ datasets: [...datasets, { values: [0], label: '', color: '' }] })}><Plus className="w-3 h-3 inline" /> 추가</button>
        </div>
        {datasets.map((ds, i) => (
          <div key={i} className="mt-1 p-2 border border-slate-100 rounded space-y-1">
            <div className="flex gap-1 items-center">
              <input type="text" value={ds.label || ''} onChange={(e) => { const arr = [...datasets]; arr[i] = { ...ds, label: e.target.value }; onChange({ datasets: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
              {datasets.length > 1 && <button type="button" onClick={() => onChange({ datasets: datasets.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>}
            </div>
            <CommaNumField label="값" value={Array.isArray(ds.values) ? ds.values : []} onChange={(v) => { const arr = [...datasets]; arr[i] = { ...ds, values: v }; onChange({ datasets: arr }); }} placeholder="3, 5, 4, 7" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PictureGraphForm({ params, onChange }: SubFormProps) {
  const categories = Array.isArray(params.categories) ? (params.categories as string[]) : [];
  const values = Array.isArray(params.values) ? (params.values as number[]) : [];
  return (
    <div className="space-y-2">
      <CommaSplitField label="범주 (쉼표 구분)" value={categories} onChange={(v) => onChange({ categories: v })} placeholder="사과, 배, 감" />
      <CommaNumField label="값 (쉼표 구분)" value={values} onChange={(v) => onChange({ values: v })} placeholder="3, 2, 5" />
      <TextField label="기호" value={String(params.symbol || '●')} onChange={(v) => onChange({ symbol: v })} placeholder="●, ☆, ♥, ○" />
      <NumField label="기호 1개 = 몇?" value={Number(params.symbolValue) || 1} onChange={(v) => onChange({ symbolValue: v })} min={1} />
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <ColorSelect value={String(params.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
    </div>
  );
}

export function PieChartForm({ params, onChange }: SubFormProps) {
  const segments = Array.isArray(params.segments) ? (params.segments as { label: string; value: number; color?: string }[]) : [];
  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <BoolField label="백분율 표시" value={params.showPercent !== false} onChange={(v) => onChange({ showPercent: v })} />
      <BoolField label="값 표시" value={!!params.showValue} onChange={(v) => onChange({ showValue: v })} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">항목</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ segments: [...segments, { label: '항목', value: 10 }] })}><Plus className="w-3 h-3 inline" /> 추가</button>
        </div>
        {segments.map((seg, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="text" value={seg.label} onChange={(e) => { const arr = [...segments]; arr[i] = { ...seg, label: e.target.value }; onChange({ segments: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="이름" />
            <input type="number" value={seg.value} onChange={(e) => { const arr = [...segments]; arr[i] = { ...seg, value: parseFloat(e.target.value) || 0 }; onChange({ segments: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="값" />
            <button type="button" onClick={() => onChange({ segments: segments.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BandChartForm({ params, onChange }: SubFormProps) {
  const segments = Array.isArray(params.segments) ? (params.segments as { label: string; value: number; color?: string }[]) : [];
  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <BoolField label="백분율 표시" value={params.showPercent !== false} onChange={(v) => onChange({ showPercent: v })} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">항목</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ segments: [...segments, { label: '항목', value: 10 }] })}><Plus className="w-3 h-3 inline" /> 추가</button>
        </div>
        {segments.map((seg, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="text" value={seg.label} onChange={(e) => { const arr = [...segments]; arr[i] = { ...seg, label: e.target.value }; onChange({ segments: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="이름" />
            <input type="number" value={seg.value} onChange={(e) => { const arr = [...segments]; arr[i] = { ...seg, value: parseFloat(e.target.value) || 0 }; onChange({ segments: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="값" />
            <button type="button" onClick={() => onChange({ segments: segments.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AngleFigureForm({ params, onChange }: SubFormProps) {
  const additionalAngles = Array.isArray(params.additionalAngles) ? params.additionalAngles as { angle: number; label?: string; color?: string }[] : [];

  return (
    <div className="space-y-2">
      <NumField label="각도 (°)" value={Number(params.angle) || 90} onChange={(v) => onChange({ angle: v })} min={0} max={360} />
      <NumField label="시작 반직선 각도 (°)" value={Number(params.ray1Angle) || 0} onChange={(v) => onChange({ ray1Angle: v })} min={0} max={360} />
      <TextField label="라벨" value={String(params.label || '')} onChange={(v) => onChange({ label: v })} placeholder="예: 60°, ∠A" />
      <BoolField label="각도기 표시" value={!!params.showProtractor} onChange={(v) => onChange({ showProtractor: v })} />
      <ColorSelect value={String(params.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
      {/* 추가 각도 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">추가 각도</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ additionalAngles: [...additionalAngles, { angle: 45 }] })}>
            + 추가
          </button>
        </div>
        {additionalAngles.map((aa, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={aa.angle} onChange={(e) => { const a = [...additionalAngles]; a[i] = { ...aa, angle: parseFloat(e.target.value) || 0 }; onChange({ additionalAngles: a }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="각도°" />
            <input type="text" value={aa.label || ''} onChange={(e) => { const a = [...additionalAngles]; a[i] = { ...aa, label: e.target.value }; onChange({ additionalAngles: a }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <button type="button" onClick={() => onChange({ additionalAngles: additionalAngles.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500 text-xs">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClockFaceForm({ params, onChange }: SubFormProps) {
  return (
    <div className="space-y-2">
      <NumField label="시" value={Number(params.hour) || 12} onChange={(v) => onChange({ hour: v })} min={1} max={12} />
      <NumField label="분" value={Number(params.minute) || 0} onChange={(v) => onChange({ minute: v })} min={0} max={59} />
      <BoolField label="숫자 표시" value={params.showNumbers !== false} onChange={(v) => onChange({ showNumbers: v })} />
      <TextField label="라벨" value={String(params.label || '')} onChange={(v) => onChange({ label: v })} placeholder="예: 3시" />
    </div>
  );
}
