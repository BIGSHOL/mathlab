'use client';

import { useState } from 'react';
import { Edit, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { MathRenderer } from '@/components/math/MathRenderer';
import type { ExtractedConcept } from '@/types/pdf-extract';

interface ConceptCardProps {
  concept: ExtractedConcept;
  index: number;
  isConceptMode: boolean;
  onUpdate: (updates: Partial<ExtractedConcept>) => void;
  onDelete: () => void;
}

/** PDF 추출 결과의 개념 카드 (편집/미리보기) */
export function ExtractionConceptCard({ concept, isConceptMode, onUpdate, onDelete }: ConceptCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(concept.title);
  const [editContent, setEditContent] = useState(concept.content);
  const [expanded, setExpanded] = useState(isConceptMode); // 개념 모드에서는 기본 펼침

  const handleSave = () => {
    onUpdate({ title: editTitle, content: editContent });
    setEditing(false);
  };

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-sm p-3">
      <div className="flex items-center gap-2 mb-2">
        {concept.sectionCode && (
          <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded font-mono font-bold">
            {concept.sectionCode}
          </span>
        )}
        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
          {concept.sectionHeader || '개념'}
        </span>
        {editing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 text-sm font-semibold px-2 py-1 border border-amber-300 rounded-sm"
          />
        ) : (
          <span className="text-sm font-semibold text-slate-800">{concept.title}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {editing ? (
            <>
              <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-700" title="저장">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditing(false); setEditTitle(concept.title); setEditContent(concept.content); }} className="p-1 text-slate-400 hover:text-slate-600" title="취소">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditing(true); setEditTitle(concept.title); setEditContent(concept.content); }} className="p-1 text-slate-400 hover:text-primary" title="편집">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500" title="삭제">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => setExpanded(!expanded)} className="p-1 text-slate-400 hover:text-slate-700">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        editing ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* 왼쪽: 마크업 편집 */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">마크업 편집</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="w-full text-sm px-3 py-2 border border-amber-300 rounded-sm font-mono"
              />
            </div>
            {/* 오른쪽: 렌더링 미리보기 */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">미리보기</label>
              <div className="prose prose-sm max-w-none p-3 bg-white border border-slate-200 rounded-sm min-h-[200px]">
                <MathRenderer content={editContent} />
              </div>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <MathRenderer content={concept.content} />
          </div>
        )
      )}
    </div>
  );
}
