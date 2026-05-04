'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps } from '../types';
import { TextField } from '../SharedControls';

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

export function TreeDiagramForm({ params, onChange }: SubFormProps) {
  const root = (params.root as { label: string; children?: unknown[] }) || { label: '시작' };

  const handleNodeChange = React.useCallback((path: number[], updates: Record<string, unknown>) => {
    const newRoot = JSON.parse(JSON.stringify(root));
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
            <button key={opt.value} type="button" onClick={() => onChange({ orientation: opt.value })} className={`px-2 py-0.5 text-xs border rounded transition-colors ${params.orientation === opt.value ? 'bg-primary text-white border-primary' : 'border-slate-200 hover:bg-slate-50'}`}>{opt.label}</button>
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
