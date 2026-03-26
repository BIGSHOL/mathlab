'use client';

import { ArrowLeft } from 'lucide-react';
import { GRADE_SHORT_LABELS, GRADE_GROUPS, CATEGORY_LABELS, PART_LABELS } from '@/lib/constants/labels';

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);
const PART_OPTIONS = Object.keys(PART_LABELS);
import type { ConceptManagerReturn } from './useConceptManager';

interface ConceptInfoBarProps {
  mgr: ConceptManagerReturn;
}

export function ConceptInfoBar({ mgr }: ConceptInfoBarProps) {
  const {
    editForm, setEditForm,
    isOwner, isHighSchool,
    chapterOptions, sectionOptions, sectionSubOptions,
  } = mgr;

  return (
    <div className="shrink-0 px-3 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-col gap-2">
      {/* 모바일 뒤로가기 */}
      <button
        onClick={() => mgr.cancelEditing()}
        className="md:hidden flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary -mb-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        목록으로
      </button>
      {/* Row 1: 제목 / 개념코드 / 출처 */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">제목 <span className="text-red-500">*</span></label>
          <input
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
            value={editForm.title}
            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
            disabled={!isOwner}
          />
        </div>
        <div className="w-24 shrink-0">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">개념 코드</label>
          <input
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm font-mono focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
            value={editForm.conceptCode}
            onChange={(e) => setEditForm((p) => ({ ...p, conceptCode: e.target.value }))}
            disabled={!isOwner}
          />
        </div>
        <div className="w-40 shrink-0">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">출처</label>
          <input
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
            value={editForm.source}
            onChange={(e) => setEditForm((p) => ({ ...p, source: e.target.value }))}
            placeholder="교재명 등"
            disabled={!isOwner}
          />
        </div>
      </div>
      {/* Row 2: 학년 / 학기 / 대단원 / 중단원 / 소단원 */}
      <div className="flex gap-3 items-end">
        <div className="w-32 shrink-0">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">학년 <span className="text-red-500">*</span></label>
          <select
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
            value={editForm.grade}
            onChange={(e) => setEditForm((p) => ({ ...p, grade: e.target.value, semester: '', chapter: '', section: '', sectionSub: '' }))}
            disabled={!isOwner}
          >
            {GRADE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.grades.map((g) => (
                  <option key={g} value={g}>{GRADE_SHORT_LABELS[g]}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {!isHighSchool && (
          <div className="w-20 shrink-0">
            <label className="block text-xs font-bold text-text-secondary mb-0.5">학기 <span className="text-red-500">*</span></label>
            <select
              className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
              value={editForm.semester}
              onChange={(e) => setEditForm((p) => ({ ...p, semester: e.target.value ? Number(e.target.value) : '', chapter: '', section: '', sectionSub: '' }))}
              disabled={!isOwner}
            >
              <option value="">-</option>
              <option value="1">1학기</option>
              <option value="2">2학기</option>
            </select>
          </div>
        )}
        <div className="flex-1">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">대단원 <span className="text-red-500">*</span></label>
          <select
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
            value={editForm.chapter}
            onChange={(e) => setEditForm((p) => ({ ...p, chapter: e.target.value, section: '', sectionSub: '' }))}
            disabled={!isOwner || chapterOptions.length === 0}
          >
            <option value="">선택</option>
            {chapterOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">중단원</label>
          <select
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
            value={editForm.section}
            onChange={(e) => setEditForm((p) => ({ ...p, section: e.target.value, sectionSub: '' }))}
            disabled={!isOwner || sectionOptions.length === 0}
          >
            <option value="">선택</option>
            {sectionOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">소단원</label>
          <select
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
            value={editForm.sectionSub}
            onChange={(e) => setEditForm((p) => ({ ...p, sectionSub: e.target.value }))}
            disabled={!isOwner || sectionSubOptions.length === 0}
          >
            <option value="">선택</option>
            {sectionSubOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>
      {/* Row 3: 카테고리 / 영역 / 키워드 */}
      <div className="flex gap-3 items-end">
        <div className="w-24 shrink-0">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">카테고리</label>
          <select
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
            value={editForm.category}
            onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
            disabled={!isOwner}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="w-28 shrink-0">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">영역 <span className="text-red-500">*</span></label>
          <select
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
            value={editForm.part}
            onChange={(e) => setEditForm((p) => ({ ...p, part: e.target.value }))}
            disabled={!isOwner}
          >
            {PART_OPTIONS.map((pt) => (
              <option key={pt} value={pt}>{PART_LABELS[pt]}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-text-secondary mb-0.5">키워드</label>
          <input
            className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
            value={editForm.keywords}
            onChange={(e) => setEditForm((p) => ({ ...p, keywords: e.target.value }))}
            placeholder="쉼표로 구분"
            disabled={!isOwner}
          />
        </div>
      </div>
    </div>
  );
}
