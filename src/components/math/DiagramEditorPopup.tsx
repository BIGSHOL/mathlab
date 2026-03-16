'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Shapes } from 'lucide-react';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import type { DiagramParam } from '@/types/pdf-extract';

// ── 타입 그룹 정의 ──
const TYPE_GROUPS = [
  {
    label: '초등',
    types: [
      { value: 'fraction_rect' as DiagramType, label: '분수 사각형' },
      { value: 'fraction_circle' as DiagramType, label: '분수 원' },
      { value: 'number_line' as DiagramType, label: '수직선' },
      { value: 'place_value' as DiagramType, label: '자릿값' },
      { value: 'dot_array' as DiagramType, label: '점 배열' },
      { value: 'flow_chart' as DiagramType, label: '흐름도' },
      { value: 'bar_chart' as DiagramType, label: '막대그래프' },
      { value: 'line_graph' as DiagramType, label: '꺾은선그래프' },
      { value: 'picture_graph' as DiagramType, label: '그림그래프' },
      { value: 'pie_chart' as DiagramType, label: '원그래프' },
      { value: 'band_chart' as DiagramType, label: '띠그래프' },
      { value: 'angle_figure' as DiagramType, label: '각도' },
      { value: 'clock_face' as DiagramType, label: '시계' },
    ],
  },
  {
    label: '중등',
    types: [
      { value: 'coordinate_plane' as DiagramType, label: '좌표평면' },
      { value: 'triangle' as DiagramType, label: '삼각형' },
      { value: 'quadrilateral' as DiagramType, label: '사각형' },
      { value: 'circle' as DiagramType, label: '원' },
      { value: 'regular_polygon' as DiagramType, label: '정다각형' },
      { value: 'function_graph' as DiagramType, label: '함수 그래프' },
      { value: 'venn_diagram' as DiagramType, label: '벤 다이어그램' },
      { value: 'histogram' as DiagramType, label: '히스토그램' },
      { value: 'stem_leaf' as DiagramType, label: '줄기잎그림' },
      { value: 'solid_figure' as DiagramType, label: '입체도형' },
      { value: 'net_diagram' as DiagramType, label: '전개도' },
      { value: 'tree_diagram' as DiagramType, label: '수형도' },
      { value: 'scatter_plot' as DiagramType, label: '산점도' },
    ],
  },
];

// ── 색상 옵션 ──
const COLOR_OPTIONS = [
  { value: '#3B82F6', label: '파랑' },
  { value: '#F97316', label: '주황' },
  { value: '#10B981', label: '초록' },
  { value: '#EF4444', label: '빨강' },
  { value: '#7C3AED', label: '보라' },
  { value: '#F59E0B', label: '노랑' },
];

// ── 기본 파라미터 ──
function getDefaultParams(type: DiagramType): Record<string, unknown> {
  switch (type) {
    case 'fraction_rect':
      return { rows: 3, cols: 1, coloredCount: 1, count: 1, hatching: false };
    case 'fraction_circle':
      return { totalParts: 4, coloredParts: 1, count: 1 };
    case 'number_line':
      return { min: 0, max: 1, step: 0.25 };
    case 'place_value':
      return { hundreds: 2, tens: 3, ones: 5 };
    case 'dot_array':
      return { rows: 3, cols: 4, symbol: '●' };
    case 'flow_chart':
      return { nodes: [{ id: 'n0', text: '시작' }, { id: 'n1', text: '끝' }], arrows: [{ from: 'n0', to: 'n1' }] };
    case 'coordinate_plane':
      return { xRange: [-5, 5], yRange: [-5, 5], gridStep: 1, points: [], lines: [] };
    case 'triangle':
      return { vertices: [{ x: 100, y: 10, label: 'A' }, { x: 10, y: 150, label: 'B' }, { x: 190, y: 150, label: 'C' }], sides: [], angles: [] };
    case 'quadrilateral':
      return { vertices: [{ x: 30, y: 10, label: 'A' }, { x: 170, y: 10, label: 'B' }, { x: 190, y: 130, label: 'C' }, { x: 10, y: 130, label: 'D' }], sides: [], angles: [], type: 'rectangle' };
    case 'circle':
      return { radius: 60, labels: [], arcs: [] };
    case 'function_graph':
      return { xRange: [-5, 5], yRange: [-5, 5], gridStep: 1, functions: [{ expression: 'x', label: 'y=x' }], points: [] };
    case 'venn_diagram':
      return { sets: [{ label: 'A', elements: [] }, { label: 'B', elements: [] }], intersection: { elements: [] } };
    case 'regular_polygon':
      return { sides: 5, diagonals: false, sideLength: '' };
    case 'bar_chart':
      return { categories: ['사과', '배', '감'], values: [5, 3, 7], title: '', yLabel: '', barColor: '#3B82F6', horizontal: false };
    case 'line_graph':
      return { categories: ['1월', '2월', '3월', '4월'], datasets: [{ values: [3, 5, 4, 7], label: '', color: '#3B82F6' }], title: '', yLabel: '', showDots: true };
    case 'picture_graph':
      return { categories: ['사과', '배', '감'], values: [3, 2, 5], symbol: '●', symbolValue: 1, title: '' };
    case 'pie_chart':
      return { segments: [{ label: '사과', value: 40 }, { label: '배', value: 30 }, { label: '감', value: 30 }], title: '', showPercent: true };
    case 'band_chart':
      return { segments: [{ label: '사과', value: 40 }, { label: '배', value: 35 }, { label: '감', value: 25 }], title: '', showPercent: true };
    case 'angle_figure':
      return { angle: 60, showProtractor: false, label: '', ray1Angle: 0, color: '#3B82F6' };
    case 'clock_face':
      return { hour: 3, minute: 0, showNumbers: true, label: '' };
    case 'histogram':
      return { bins: [{ range: [0, 10], frequency: 3 }, { range: [10, 20], frequency: 7 }, { range: [20, 30], frequency: 5 }, { range: [30, 40], frequency: 2 }], title: '', xLabel: '', yLabel: '도수', showFrequencyPolygon: false, color: '#3B82F6' };
    case 'stem_leaf':
      return { stems: [{ stem: 1, leaves: [2, 3, 5] }, { stem: 2, leaves: [0, 4, 7, 8] }, { stem: 3, leaves: [1, 6] }], title: '' };
    case 'solid_figure':
      return { shape: 'cube', labels: [], showHiddenEdges: true, color: '#3B82F6' };
    case 'net_diagram':
      return { shape: 'cube', labels: [], foldLines: true, color: '#3B82F6' };
    case 'tree_diagram':
      return { root: { label: '시작', children: [{ label: 'A', children: [{ label: 'a' }, { label: 'b' }] }, { label: 'B', children: [{ label: 'a' }, { label: 'b' }] }] }, title: '', orientation: 'horizontal' };
    case 'scatter_plot':
      return { points: [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 3 }, { x: 4, y: 6 }, { x: 5, y: 5 }], xRange: [0, 6], yRange: [0, 7], xLabel: '', yLabel: '', gridStep: 1, showTrendLine: false };
    default:
      return {};
  }
}

// ── 공통 폼 헬퍼 ──
function NumField({ label, value, onChange, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="block w-full text-sm px-2 py-1 border border-slate-300 rounded"
      />
    </div>
  );
}

function BoolField({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

function ColorSelect({ value, onChange }: {
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500">색상</label>
      <div className="flex gap-1.5 mt-1">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${value === c.value ? 'border-slate-800 scale-110' : 'border-slate-200'}`}
            style={{ backgroundColor: c.value }}
            title={c.label}
          />
        ))}
      </div>
    </div>
  );
}

/** 도형 공통 스타일 (면 색칠/빗금/선 색상) */
function ShapeStyleFields({ params, onChange }: SubFormProps) {
  const STROKE_COLORS = [
    { value: '', label: '기본(파랑)' },
    { value: '#333333', label: '검정' },
    { value: '#EF4444', label: '빨강' },
    { value: '#10B981', label: '초록' },
    { value: '#F97316', label: '주황' },
    { value: '#7C3AED', label: '보라' },
  ];
  const FILL_COLORS = [
    { value: '', label: '기본' },
    { value: '#3B82F6', label: '파랑' },
    { value: '#EF4444', label: '빨강' },
    { value: '#10B981', label: '초록' },
    { value: '#F97316', label: '주황' },
    { value: '#F59E0B', label: '노랑' },
    { value: '#7C3AED', label: '보라' },
  ];

  return (
    <div className="space-y-2 border-t border-slate-100 pt-2 mt-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">스타일</span>
      {/* 선 색상 */}
      <div>
        <label className="text-xs text-slate-500">선 색상</label>
        <div className="flex gap-1.5 mt-1">
          {STROKE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ strokeColor: c.value || undefined })}
              className={`w-5 h-5 rounded-full border-2 transition-all ${(String(params.strokeColor || '')) === c.value ? 'border-slate-800 scale-110' : 'border-slate-200'}`}
              style={{ backgroundColor: c.value || '#3B82F6' }}
              title={c.label}
            />
          ))}
        </div>
      </div>
      {/* 면 색상 */}
      <div>
        <label className="text-xs text-slate-500">면 색상</label>
        <div className="flex gap-1.5 mt-1 items-center">
          {FILL_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ fill: c.value || undefined })}
              className={`w-5 h-5 rounded-full border-2 transition-all ${(String(params.fill || '')) === c.value ? 'border-slate-800 scale-110' : 'border-slate-200'}`}
              style={{ backgroundColor: c.value || '#EFF6FF' }}
              title={c.label}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        <BoolField label="면 빗금" value={!!params.hatching} onChange={(v) => onChange({ hatching: v })} />
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full text-sm px-2 py-1 border border-slate-300 rounded"
      />
    </div>
  );
}

// ── 타입별 서브폼들 ──
interface SubFormProps {
  params: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

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

function FractionRectForm({ params, onChange }: SubFormProps) {
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
          <div className="text-[10px] text-slate-400 mt-1">또는 셀 클릭으로 개별 지정:</div>
          <CellGrid
            rows={rows}
            cols={cols}
            count={Number(p.count) || 1}
            coloredCells={coloredCells}
            hatchedCells={hatchedCells}
            color={String(p.color || '#3B82F6')}
            onChange={(colored, hatched) => onChange({ coloredCells: colored, hatchedCells: hatched, coloredCount: undefined, hatching: false })}
          />
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
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

/** 분수 원 클릭 편집기: 파이 조각 클릭으로 색칠/빗금 */
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

function FractionCircleForm({ params, onChange }: SubFormProps) {
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
          <div className="text-[10px] text-slate-400 mt-1">또는 조각 클릭으로 개별 지정:</div>
          <SliceGrid
            totalParts={totalParts}
            count={count}
            coloredSlices={coloredSlices}
            hatchedSlices={hatchedSlices}
            color={String(p.color || '#3B82F6')}
            onChange={(colored, hatched) => onChange({ coloredSlices: colored, hatchedSlices: hatched, coloredParts: 0, hatching: false })}
          />
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
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

function NumberLineForm({ params, onChange }: SubFormProps) {
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
            <label className="flex items-center gap-0.5 text-[10px] text-slate-500 cursor-pointer shrink-0" title="점 표시">
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
            <label className="flex items-center gap-0.5 text-[10px] text-slate-500 cursor-pointer shrink-0" title="점선">
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

function PlaceValueForm({ params, onChange }: SubFormProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <NumField label="백의 자리" value={Number(params.hundreds) || 0} onChange={(v) => onChange({ hundreds: v })} min={0} max={9} />
      <NumField label="십의 자리" value={Number(params.tens) || 0} onChange={(v) => onChange({ tens: v })} min={0} max={9} />
      <NumField label="일의 자리" value={Number(params.ones) || 0} onChange={(v) => onChange({ ones: v })} min={0} max={9} />
    </div>
  );
}

function DotArrayForm({ params, onChange }: SubFormProps) {
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

function FlowChartForm({ params, onChange }: SubFormProps) {
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
          <button type="button" onClick={() => applyLayout('down')} className="px-2 py-0.5 text-[10px] border border-slate-200 rounded hover:bg-slate-50">↓ 세로</button>
          <button type="button" onClick={() => applyLayout('right')} className="px-2 py-0.5 text-[10px] border border-slate-200 rounded hover:bg-slate-50">→ 가로</button>
          <button type="button" onClick={() => applyLayout('grid')} className="px-2 py-0.5 text-[10px] border border-slate-200 rounded hover:bg-slate-50">▦ 격자</button>
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
            <span className="text-[10px] text-slate-400 w-6 shrink-0">{n.id}</span>
            <input type="text" value={n.text} onChange={(e) => { const arr = [...nodes]; arr[i] = { ...n, text: e.target.value }; onChange({ nodes: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="텍스트" />
            <input type="number" value={n.x ?? 0} step={10} onChange={(e) => { const arr = [...nodes]; arr[i] = { ...n, x: parseInt(e.target.value) || 0 }; onChange({ nodes: arr }); }} className="w-12 text-[10px] px-1 py-0.5 border border-slate-300 rounded" title="X" />
            <input type="number" value={n.y ?? i * 60} step={10} onChange={(e) => { const arr = [...nodes]; arr[i] = { ...n, y: parseInt(e.target.value) || 0 }; onChange({ nodes: arr }); }} className="w-12 text-[10px] px-1 py-0.5 border border-slate-300 rounded" title="Y" />
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

// ── 중등 서브폼 ──

interface Point2DInput { x: number; y: number; label?: string }

function PointListEditor({ points, onChange, label: sectionLabel }: { points: Point2DInput[]; onChange: (pts: Point2DInput[]) => void; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-500">{sectionLabel}</label>
        <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange([...points, { x: 0, y: 0 }])}>
          <Plus className="w-3 h-3 inline" /> 추가
        </button>
      </div>
      {points.map((pt, i) => (
        <div key={i} className="flex gap-1 mt-1 items-center">
          <input type="number" value={pt.x} step={0.5} onChange={(e) => { const arr = [...points]; arr[i] = { ...pt, x: parseFloat(e.target.value) || 0 }; onChange(arr); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="x" />
          <input type="number" value={pt.y} step={0.5} onChange={(e) => { const arr = [...points]; arr[i] = { ...pt, y: parseFloat(e.target.value) || 0 }; onChange(arr); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="y" />
          <input type="text" value={pt.label || ''} onChange={(e) => { const arr = [...points]; arr[i] = { ...pt, label: e.target.value }; onChange(arr); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
          <button type="button" onClick={() => onChange(points.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
        </div>
      ))}
    </div>
  );
}

function CoordinatePlaneForm({ params, onChange }: SubFormProps) {
  const xRange = Array.isArray(params.xRange) ? params.xRange as number[] : [-5, 5];
  const yRange = Array.isArray(params.yRange) ? params.yRange as number[] : [-5, 5];
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
      <PointListEditor points={points} onChange={(pts) => onChange({ points: pts })} label="점" />
    </div>
  );
}

function TriangleForm({ params, onChange }: SubFormProps) {
  const vertices = Array.isArray(params.vertices) ? params.vertices as Point2DInput[] : [{ x: 100, y: 10, label: 'A' }, { x: 10, y: 150, label: 'B' }, { x: 190, y: 150, label: 'C' }];
  const sides = Array.isArray(params.sides) ? params.sides as { from: number; to: number; label: string }[] : [];
  const angles = Array.isArray(params.angles) ? params.angles as { vertex: number; value: string }[] : [];

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500">꼭짓점 (x, y, 라벨)</label>
      {vertices.map((v, i) => (
        <div key={i} className="flex gap-1 items-center">
          <input type="number" value={v.x} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, x: parseFloat(e.target.value) || 0 }; onChange({ vertices: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
          <input type="number" value={v.y} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, y: parseFloat(e.target.value) || 0 }; onChange({ vertices: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
          <input type="text" value={v.label || ''} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, label: e.target.value }; onChange({ vertices: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
        </div>
      ))}
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
            <input type="number" value={s.from} min={0} max={2} onChange={(e) => { const arr = [...sides]; arr[i] = { ...s, from: parseInt(e.target.value) || 0 }; onChange({ sides: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <span className="text-xs text-slate-400">&ndash;</span>
            <input type="number" value={s.to} min={0} max={2} onChange={(e) => { const arr = [...sides]; arr[i] = { ...s, to: parseInt(e.target.value) || 0 }; onChange({ sides: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <input type="text" value={s.label} onChange={(e) => { const arr = [...sides]; arr[i] = { ...s, label: e.target.value }; onChange({ sides: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
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
            <input type="number" value={a.vertex} min={0} max={2} onChange={(e) => { const arr = [...angles]; arr[i] = { ...a, vertex: parseInt(e.target.value) || 0 }; onChange({ angles: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 인덱스" />
            <input type="text" value={a.value} onChange={(e) => { const arr = [...angles]; arr[i] = { ...a, value: e.target.value }; onChange({ angles: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="예: 60°" />
            <button type="button" onClick={() => onChange({ angles: angles.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}

function QuadrilateralForm({ params, onChange }: SubFormProps) {
  const vertices = Array.isArray(params.vertices) ? params.vertices as Point2DInput[] : [];
  const QUAD_TYPES = ['rectangle', 'square', 'parallelogram', 'trapezoid', 'rhombus'];

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-slate-500">유형</label>
        <select value={String(params.type || 'rectangle')} onChange={(e) => onChange({ type: e.target.value })} className="block w-full text-sm px-2 py-1 border border-slate-300 rounded">
          {QUAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <label className="text-xs text-slate-500">꼭짓점 (x, y, 라벨)</label>
      {vertices.map((v, i) => (
        <div key={i} className="flex gap-1 items-center">
          <input type="number" value={v.x} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, x: parseFloat(e.target.value) || 0 }; onChange({ vertices: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
          <input type="number" value={v.y} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, y: parseFloat(e.target.value) || 0 }; onChange({ vertices: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
          <input type="text" value={v.label || ''} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, label: e.target.value }; onChange({ vertices: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
        </div>
      ))}
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}

function CircleForm({ params, onChange }: SubFormProps) {
  const labels = Array.isArray(params.labels) ? params.labels as { text: string; angle: number; position?: 'outside' | 'center' }[] : [];
  const arcs = Array.isArray(params.arcs) ? params.arcs as { startAngle: number; endAngle: number; label?: string; color?: string; strokeWidth?: number }[] : [];

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
            <select value={l.position || 'outside'} onChange={(e) => { const arr = [...labels]; arr[i] = { ...l, position: e.target.value as 'outside' | 'center' }; onChange({ labels: arr }); }} className="text-[10px] px-1 py-0.5 border border-slate-300 rounded">
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
              {/* 호 색상 */}
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
              {/* 호 두께 */}
              <label className="flex items-center gap-0.5 text-[10px] text-slate-500 ml-1 shrink-0">
                두께
                <input type="number" value={a.strokeWidth || 4} min={1} max={10} step={0.5} onChange={(e) => { const arr = [...arcs]; arr[i] = { ...a, strokeWidth: parseFloat(e.target.value) || 4 }; onChange({ arcs: arr }); }} className="w-10 text-[10px] px-1 py-0.5 border border-slate-300 rounded bg-white" />
              </label>
            </div>
          </div>
        ))}
      </div>
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}

const LINE_COLOR_OPTIONS = [
  { value: '', label: '기본(검정)' },
  { value: '#3B82F6', label: '파랑' },
  { value: '#EF4444', label: '빨강' },
  { value: '#10B981', label: '초록' },
  { value: '#F97316', label: '주황' },
  { value: '#7C3AED', label: '보라' },
];

function FunctionGraphForm({ params, onChange }: SubFormProps) {
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
              {/* 색상 선택 */}
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
              {/* 점선 토글 */}
              <label className="flex items-center gap-0.5 text-[10px] text-slate-500 cursor-pointer ml-1 shrink-0">
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

/** 쉼표 구분 원소 입력 — 로컬 상태로 입력 중 쉼표 유실 방지, blur 시 파싱 */
function ElementsInput({ value, onChange, placeholder, className }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string; className?: string;
}) {
  const [raw, setRaw] = useState(value.join(', '));
  // 외부 value가 바뀌면 동기화 (단, 입력 중이 아닐 때)
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== ref.current) {
      setRaw(value.join(', '));
    }
  }, [value]);

  const commit = (text: string) => {
    onChange(text.split(',').map(x => x.trim()).filter(Boolean));
  };

  return (
    <input
      ref={ref}
      type="text"
      value={raw}
      onChange={(e) => {
        setRaw(e.target.value);
        commit(e.target.value);
      }}
      onBlur={() => {
        // 정리: 트리밍 후 표시
        const parsed = raw.split(',').map(x => x.trim()).filter(Boolean);
        setRaw(parsed.join(', '));
        onChange(parsed);
      }}
      placeholder={placeholder}
      className={className || 'flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded'}
    />
  );
}

/** 라벨 + ElementsInput 조합 */
function ElementsField({ label: fieldLabel, value, onChange, placeholder }: {
  label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500">{fieldLabel}</label>
      <ElementsInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="block w-full text-sm px-2 py-1 border border-slate-300 rounded"
      />
    </div>
  );
}

function VennDiagramForm({ params, onChange }: SubFormProps) {
  const sets = Array.isArray(params.sets) ? params.sets as { label: string; elements?: string[] }[] : [];
  const n = sets.length;
  const intersection = (params.intersection as { elements?: string[] }) || { elements: [] };
  const intersectionAB = (params.intersectionAB as { elements?: string[] }) || { elements: [] };
  const intersectionBC = (params.intersectionBC as { elements?: string[] }) || { elements: [] };
  const intersectionAC = (params.intersectionAC as { elements?: string[] }) || { elements: [] };

  const canAdd = n < 3;

  return (
    <div className="space-y-2">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">집합 (최대 3개)</label>
          {canAdd ? (
            <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ sets: [...sets, { label: String.fromCharCode(65 + n), elements: [] }] })}>
              <Plus className="w-3 h-3 inline" /> 추가
            </button>
          ) : (
            <span className="text-[10px] text-slate-400">최대 3개</span>
          )}
        </div>
        {sets.map((s, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="text" value={s.label} onChange={(e) => { const arr = [...sets]; arr[i] = { ...s, label: e.target.value }; onChange({ sets: arr }); }} className="w-12 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="이름" />
            <ElementsInput
              value={s.elements || []}
              onChange={(els) => { const arr = [...sets]; arr[i] = { ...s, elements: els }; onChange({ sets: arr }); }}
              placeholder="원소 (쉼표 구분)"
            />
            {n > 2 && <button type="button" onClick={() => onChange({ sets: sets.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>}
          </div>
        ))}
      </div>
      {/* 교집합 */}
      {n >= 3 ? (
        <>
          <ElementsField
            label={`${sets[0]?.label || 'A'}∩${sets[1]?.label || 'B'} 교집합`}
            value={intersectionAB.elements || []}
            onChange={(els) => onChange({ intersectionAB: { elements: els } })}
            placeholder="쉼표 구분"
          />
          <ElementsField
            label={`${sets[1]?.label || 'B'}∩${sets[2]?.label || 'C'} 교집합`}
            value={intersectionBC.elements || []}
            onChange={(els) => onChange({ intersectionBC: { elements: els } })}
            placeholder="쉼표 구분"
          />
          <ElementsField
            label={`${sets[0]?.label || 'A'}∩${sets[2]?.label || 'C'} 교집합`}
            value={intersectionAC.elements || []}
            onChange={(els) => onChange({ intersectionAC: { elements: els } })}
            placeholder="쉼표 구분"
          />
          <ElementsField
            label={`${sets[0]?.label || 'A'}∩${sets[1]?.label || 'B'}∩${sets[2]?.label || 'C'} 전체 교집합`}
            value={intersection.elements || []}
            onChange={(els) => onChange({ intersection: { elements: els } })}
            placeholder="쉼표 구분"
          />
        </>
      ) : (
        <ElementsField
          label="교집합 원소"
          value={intersection.elements || []}
          onChange={(els) => onChange({ intersection: { elements: els } })}
          placeholder="쉼표 구분"
        />
      )}
    </div>
  );
}

function RegularPolygonForm({ params, onChange }: SubFormProps) {
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
              className={`px-2 py-0.5 text-[10px] border rounded transition-colors ${mode === opt.value ? 'bg-primary text-white border-primary' : 'border-slate-200 hover:bg-slate-50'}`}
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
              <input type="number" value={d.from} min={0} max={nSides - 1} onChange={(e) => { const arr = [...diagArray]; arr[i] = { ...d, from: parseInt(e.target.value) || 0 }; onChange({ diagonals: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 시작" />
              <span className="text-xs text-slate-400">&ndash;</span>
              <input type="number" value={d.to} min={0} max={nSides - 1} onChange={(e) => { const arr = [...diagArray]; arr[i] = { ...d, to: parseInt(e.target.value) || 0 }; onChange({ diagonals: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 끝" />
              <select value={d.style || 'solid'} onChange={(e) => { const arr = [...diagArray]; arr[i] = { ...d, style: e.target.value as 'solid' | 'dashed' }; onChange({ diagonals: arr }); }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
                <option value="solid">실선</option>
                <option value="dashed">점선</option>
              </select>
              <button type="button" onClick={() => onChange({ diagonals: diagArray.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          <p className="text-[10px] text-slate-400 mt-1">꼭짓점 번호: 0 (상단) ~ {nSides - 1} (시계방향)</p>
        </div>
      )}
      <TextField label="변의 길이" value={String(params.sideLength || '')} onChange={(v) => onChange({ sideLength: v })} placeholder="예: 5cm" />
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}

// ── 신규 13개 타입 서브폼들 ──

/** 쉼표 구분 문자열 입력 → string[] */
function CommaSplitField({ label: fieldLabel, value, onChange, placeholder }: {
  label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [raw, setRaw] = React.useState(value.join(', '));
  React.useEffect(() => { setRaw(value.join(', ')); }, [value]);
  return (
    <div>
      <label className="text-xs text-slate-500">{fieldLabel}</label>
      <input type="text" value={raw} onChange={(e) => { setRaw(e.target.value); onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean)); }} className="block w-full text-sm px-2 py-1 border border-slate-300 rounded" placeholder={placeholder} />
    </div>
  );
}

/** 쉼표 구분 숫자 입력 → number[] */
function CommaNumField({ label: fieldLabel, value, onChange, placeholder }: {
  label: string; value: number[]; onChange: (v: number[]) => void; placeholder?: string;
}) {
  const [raw, setRaw] = React.useState(value.join(', '));
  React.useEffect(() => { setRaw(value.join(', ')); }, [value]);
  return (
    <div>
      <label className="text-xs text-slate-500">{fieldLabel}</label>
      <input type="text" value={raw} onChange={(e) => { setRaw(e.target.value); onChange(e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))); }} className="block w-full text-sm px-2 py-1 border border-slate-300 rounded" placeholder={placeholder} />
    </div>
  );
}

function BarChartForm({ params, onChange }: SubFormProps) {
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

function LineGraphForm({ params, onChange }: SubFormProps) {
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

function PictureGraphForm({ params, onChange }: SubFormProps) {
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

function PieChartForm({ params, onChange }: SubFormProps) {
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

function BandChartForm({ params, onChange }: SubFormProps) {
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

function AngleFigureForm({ params, onChange }: SubFormProps) {
  return (
    <div className="space-y-2">
      <NumField label="각도 (°)" value={Number(params.angle) || 90} onChange={(v) => onChange({ angle: v })} min={0} max={360} />
      <NumField label="시작 반직선 각도 (°)" value={Number(params.ray1Angle) || 0} onChange={(v) => onChange({ ray1Angle: v })} min={0} max={360} />
      <TextField label="라벨" value={String(params.label || '')} onChange={(v) => onChange({ label: v })} placeholder="예: 60°, ∠A" />
      <BoolField label="각도기 표시" value={!!params.showProtractor} onChange={(v) => onChange({ showProtractor: v })} />
      <ColorSelect value={String(params.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
    </div>
  );
}

function ClockFaceForm({ params, onChange }: SubFormProps) {
  return (
    <div className="space-y-2">
      <NumField label="시" value={Number(params.hour) || 12} onChange={(v) => onChange({ hour: v })} min={1} max={12} />
      <NumField label="분" value={Number(params.minute) || 0} onChange={(v) => onChange({ minute: v })} min={0} max={59} />
      <BoolField label="숫자 표시" value={params.showNumbers !== false} onChange={(v) => onChange({ showNumbers: v })} />
      <TextField label="라벨" value={String(params.label || '')} onChange={(v) => onChange({ label: v })} placeholder="예: 3시" />
    </div>
  );
}

function HistogramForm({ params, onChange }: SubFormProps) {
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
            <span className="text-[10px] text-slate-400">도수:</span>
            <input type="number" value={b.frequency} onChange={(e) => { const arr = [...bins]; arr[i] = { ...b, frequency: parseInt(e.target.value) || 0 }; onChange({ bins: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <button type="button" onClick={() => onChange({ bins: bins.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StemLeafForm({ params, onChange }: SubFormProps) {
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
            <input type="number" value={s.stem} onChange={(e) => { const arr = [...stems]; arr[i] = { ...s, stem: parseInt(e.target.value) || 0 }; onChange({ stems: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="줄기" />
            <span className="text-xs text-slate-400">|</span>
            <input type="text" value={Array.isArray(s.leaves) ? s.leaves.join(', ') : ''} onChange={(e) => { const arr = [...stems]; arr[i] = { ...s, leaves: e.target.value.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)) }; onChange({ stems: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="잎 (쉼표 구분)" />
            <button type="button" onClick={() => onChange({ stems: stems.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

const SOLID_SHAPES = [
  { value: 'cube', label: '정육면체' },
  { value: 'rectangular_prism', label: '직육면체' },
  { value: 'cylinder', label: '원기둥' },
  { value: 'cone', label: '원뿔' },
  { value: 'triangular_prism', label: '삼각기둥' },
  { value: 'pyramid', label: '사각뿔' },
  { value: 'sphere', label: '구' },
];

function SolidFigureForm({ params, onChange }: SubFormProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-slate-500">도형</label>
        <select value={String(params.shape || 'cube')} onChange={(e) => onChange({ shape: e.target.value })} className="block w-full text-sm px-2 py-1 border border-slate-300 rounded">
          {SOLID_SHAPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <BoolField label="숨은 모서리 (점선)" value={params.showHiddenEdges !== false} onChange={(v) => onChange({ showHiddenEdges: v })} />
      <ColorSelect value={String(params.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
    </div>
  );
}

const NET_SHAPES = [
  { value: 'cube', label: '정육면체' },
  { value: 'rectangular_prism', label: '직육면체' },
  { value: 'cylinder', label: '원기둥' },
  { value: 'cone', label: '원뿔' },
  { value: 'triangular_prism', label: '삼각기둥' },
  { value: 'pyramid', label: '사각뿔' },
];

function NetDiagramForm({ params, onChange }: SubFormProps) {
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

/** 수형도: 재귀 트리 편집기 */
function TreeNodeEditor({ node, path, onChange }: {
  node: { label: string; children?: { label: string; children?: unknown[]; probability?: string }[]; probability?: string };
  path: number[];
  onChange: (path: number[], updates: Record<string, unknown>) => void;
}) {
  const children = Array.isArray(node.children) ? node.children : [];
  return (
    <div className="ml-3 border-l border-slate-200 pl-2">
      <div className="flex gap-1 items-center mt-1">
        <input type="text" value={node.label} onChange={(e) => onChange(path, { label: e.target.value })} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="이름" />
        {path.length > 0 && (
          <input type="text" value={node.probability || ''} onChange={(e) => onChange(path, { probability: e.target.value })} className="w-12 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="확률" title="확률 (예: 1/2)" />
        )}
        <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange(path, { children: [...children, { label: '' }] })} title="자식 추가"><Plus className="w-3 h-3" /></button>
        {path.length > 0 && (
          <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => onChange(path, { __delete: true })} title="삭제"><Trash2 className="w-3 h-3" /></button>
        )}
      </div>
      {children.map((child, i) => (
        <TreeNodeEditor key={i} node={child as typeof node} path={[...path, i]} onChange={onChange} />
      ))}
    </div>
  );
}

function TreeDiagramForm({ params, onChange }: SubFormProps) {
  const root = (params.root as { label: string; children?: unknown[] }) || { label: '시작' };

  // 재귀 업데이트
  const handleNodeChange = React.useCallback((path: number[], updates: Record<string, unknown>) => {
    const newRoot = JSON.parse(JSON.stringify(root));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let target: any = newRoot;
    for (let i = 0; i < path.length; i++) {
      if (!Array.isArray(target.children)) target.children = [];
      if (i === path.length - 1) {
        if (updates.__delete) {
          target.children.splice(path[i], 1);
          onChange({ root: newRoot });
          return;
        }
        target.children[path[i]] = { ...target.children[path[i]], ...updates };
        onChange({ root: newRoot });
        return;
      }
      target = target.children[path[i]];
    }
    // path.length === 0 → root 자체
    Object.assign(newRoot, updates);
    onChange({ root: newRoot });
  }, [root, onChange]);

  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <div>
        <label className="text-xs text-slate-500">방향</label>
        <div className="flex gap-1.5 mt-1">
          {[{ value: 'horizontal', label: '가로 (→)' }, { value: 'vertical', label: '세로 (↓)' }].map(opt => (
            <button key={opt.value} type="button" onClick={() => onChange({ orientation: opt.value })} className={`px-2 py-0.5 text-[10px] border rounded transition-colors ${params.orientation === opt.value ? 'bg-primary text-white border-primary' : 'border-slate-200 hover:bg-slate-50'}`}>{opt.label}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500">트리 구조</label>
        <TreeNodeEditor node={root as { label: string; children?: { label: string; children?: unknown[]; probability?: string }[] }} path={[]} onChange={handleNodeChange} />
      </div>
    </div>
  );
}

function ScatterPlotForm({ params, onChange }: SubFormProps) {
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
              <span className="text-[10px] text-slate-400 w-3">{i + 1}</span>
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

// ── 서브폼 디스패처 ──
function DiagramSubForm({ type, params, onChange }: { type: DiagramType } & SubFormProps) {
  switch (type) {
    case 'fraction_rect': return <FractionRectForm params={params} onChange={onChange} />;
    case 'fraction_circle': return <FractionCircleForm params={params} onChange={onChange} />;
    case 'number_line': return <NumberLineForm params={params} onChange={onChange} />;
    case 'place_value': return <PlaceValueForm params={params} onChange={onChange} />;
    case 'dot_array': return <DotArrayForm params={params} onChange={onChange} />;
    case 'flow_chart': return <FlowChartForm params={params} onChange={onChange} />;
    case 'bar_chart': return <BarChartForm params={params} onChange={onChange} />;
    case 'line_graph': return <LineGraphForm params={params} onChange={onChange} />;
    case 'picture_graph': return <PictureGraphForm params={params} onChange={onChange} />;
    case 'pie_chart': return <PieChartForm params={params} onChange={onChange} />;
    case 'band_chart': return <BandChartForm params={params} onChange={onChange} />;
    case 'angle_figure': return <AngleFigureForm params={params} onChange={onChange} />;
    case 'clock_face': return <ClockFaceForm params={params} onChange={onChange} />;
    case 'coordinate_plane': return <CoordinatePlaneForm params={params} onChange={onChange} />;
    case 'triangle': return <TriangleForm params={params} onChange={onChange} />;
    case 'quadrilateral': return <QuadrilateralForm params={params} onChange={onChange} />;
    case 'circle': return <CircleForm params={params} onChange={onChange} />;
    case 'function_graph': return <FunctionGraphForm params={params} onChange={onChange} />;
    case 'venn_diagram': return <VennDiagramForm params={params} onChange={onChange} />;
    case 'regular_polygon': return <RegularPolygonForm params={params} onChange={onChange} />;
    case 'histogram': return <HistogramForm params={params} onChange={onChange} />;
    case 'stem_leaf': return <StemLeafForm params={params} onChange={onChange} />;
    case 'solid_figure': return <SolidFigureForm params={params} onChange={onChange} />;
    case 'net_diagram': return <NetDiagramForm params={params} onChange={onChange} />;
    case 'tree_diagram': return <TreeDiagramForm params={params} onChange={onChange} />;
    case 'scatter_plot': return <ScatterPlotForm params={params} onChange={onChange} />;
    default: return <p className="text-xs text-slate-400">지원하지 않는 타입입니다.</p>;
  }
}

// ── 메인 팝업 ──
interface DiagramEditorPopupProps {
  isOpen: boolean;
  initialParam: DiagramParam | null; // null = 새로 추가
  diagramIndex?: number | null; // 0-based, 표시 시 +1
  onClose: () => void;
  onSave: (param: DiagramParam, svg: string) => void;
}

export function DiagramEditorPopup({ isOpen, initialParam, diagramIndex, onClose, onSave }: DiagramEditorPopupProps) {
  const [diagramType, setDiagramType] = useState<DiagramType>((initialParam?.type as DiagramType) ?? 'fraction_rect');
  const [params, setParams] = useState<Record<string, unknown>>(initialParam?.params ?? getDefaultParams((initialParam?.type as DiagramType) ?? 'fraction_rect'));
  const [label, setLabel] = useState(initialParam?.label ?? '');
  const [align, setAlign] = useState<'left' | 'center' | 'right'>(initialParam?.align ?? 'left');

  // initialParam이 바뀌면 상태 초기화
  useEffect(() => {
    if (isOpen) {
      const type = (initialParam?.type as DiagramType) ?? 'fraction_rect';
      setDiagramType(type);
      setParams(initialParam?.params ?? getDefaultParams(type));
      setLabel(initialParam?.label ?? '');
      setAlign(initialParam?.align ?? 'left');
    }
  }, [isOpen, initialParam]);

  // 파라미터 업데이트 핸들러
  const handleParamChange = useCallback((updates: Record<string, unknown>) => {
    setParams(prev => ({ ...prev, ...updates }));
  }, []);

  // 타입 변경 시 기본 파라미터로 리셋
  const handleTypeChange = useCallback((newType: DiagramType) => {
    setDiagramType(newType);
    setParams(getDefaultParams(newType));
    setLabel('');
  }, []);

  // 실시간 SVG 프리뷰
  const liveSvg = useMemo(() => {
    try {
      return renderDiagram({ type: diagramType, params }) ?? '';
    } catch {
      return '';
    }
  }, [diagramType, params]);

  const handleSave = useCallback(() => {
    const svg = renderDiagram({ type: diagramType, params }) ?? '';
    onSave({ type: diagramType, label: label || diagramType, params, align }, svg);
  }, [diagramType, params, label, align, onSave]);

  // ESC 키
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 팝업 */}
      <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Shapes className="w-5 h-5 text-primary" />
            도형 편집기
            {diagramIndex != null && (
              <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">[그림{diagramIndex + 1}]</span>
            )}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* 타입 선택 */}
          <div className="mb-4">
            {TYPE_GROUPS.map((group) => (
              <div key={group.label} className="mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.label}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {group.types.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleTypeChange(t.value)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-sm border transition-colors ${
                        diagramType === t.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 2열: 파라미터 + 프리뷰 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 좌측: 파라미터 */}
            <div className="space-y-3">
              <TextField label="도형 설명" value={label} onChange={setLabel} placeholder="예: 3등분 색칠 사각형" />
              {/* 정렬 옵션 */}
              <div>
                <label className="text-xs text-slate-500">도형 정렬</label>
                <div className="flex gap-1.5 mt-1">
                  {([['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAlign(val)}
                      className={`px-2.5 py-1 text-xs border rounded-sm transition-colors ${
                        align === val ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <DiagramSubForm type={diagramType} params={params} onChange={handleParamChange} />
              </div>
            </div>

            {/* 우측: 프리뷰 */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">미리보기</label>
              <div className="border border-slate-200 rounded-md bg-slate-50 p-3 flex items-center justify-center min-h-[180px]">
                {liveSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: liveSvg }} className="[&_svg]:max-w-full [&_svg]:h-auto" />
                ) : (
                  <span className="text-slate-400 text-sm">미리보기 없음</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-sm transition-colors">
            취소
          </button>
          <button onClick={handleSave} disabled={!liveSvg} className="px-5 py-2 text-sm bg-primary text-white rounded-sm hover:bg-primary/90 disabled:opacity-40 transition-colors">
            {initialParam ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
