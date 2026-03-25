'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps, Point2DInput } from './types';
import { COLOR_OPTIONS } from './types';

// ── 공통 폼 헬퍼 ──
export function NumField({ label, value, onChange, min, max, step }: {
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

export function BoolField({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

export function ColorSelect({ value, onChange }: {
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
export function ShapeStyleFields({ params, onChange }: SubFormProps) {
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
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">스타일</span>
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

export function TextField({ label, value, onChange, placeholder }: {
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

export function PointListEditor({ points, onChange, label: sectionLabel }: { points: Point2DInput[]; onChange: (pts: Point2DInput[]) => void; label: string }) {
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

/** 쉼표 구분 원소 입력 — 로컬 상태로 입력 중 쉼표 유실 방지, blur 시 파싱 */
export function ElementsInput({ value, onChange, placeholder, className }: {
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
export function ElementsField({ label: fieldLabel, value, onChange, placeholder }: {
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

/** 쉼표 구분 문자열 입력 → string[] */
export function CommaSplitField({ label: fieldLabel, value, onChange, placeholder }: {
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
export function CommaNumField({ label: fieldLabel, value, onChange, placeholder }: {
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
