'use client';

import { useState, useRef } from 'react';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import type { ConceptItem, BlankDifficulty, BlankItem, BlankChild, BlankExercise, BlankFormState, EditFormState } from '../types';

// 한글 초성 추출
function getChosung(str: string): string {
  const initials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  let result = '';
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      result += initials[Math.floor((code - 0xAC00) / 588)];
    } else {
      result += ch;
    }
  }
  return result;
}

interface BlankEditorDeps {
  editingConcept: ConceptItem | null;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
}

export function useBlankEditor(deps: BlankEditorDeps) {
  const { editingConcept, editForm, setEditForm } = deps;

  // State
  const [blankExercises, setBlankExercises] = useState<BlankExercise[]>([]);
  const [blanksLoading, setBlanksLoading] = useState(false);
  const [editingBlank, setEditingBlank] = useState<BlankExercise | null>(null);
  const [blankForm, setBlankForm] = useState<BlankFormState>({ level: 1, templateText: '', blanks: [] as BlankItem[] });
  const [isNewBlank, setIsNewBlank] = useState(false);
  const [blankSaving, setBlankSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [savedBlankForm, setSavedBlankForm] = useState('');

  // UI state
  const [templateViewMode, setTemplateViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [templateMathPopup, setTemplateMathPopup] = useState<{ latex: string; start: number; end: number } | null>(null);
  const [editingBlankPos, setEditingBlankPos] = useState<number | null>(null);
  const [previewOriginalOpen, setPreviewOriginalOpen] = useState(true);
  const [previewStudentOpen, setPreviewStudentOpen] = useState(true);

  // Refs
  const templateHighlightRef = useRef<HTMLDivElement>(null);
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Undo/redo
  const templateHistory = useRef<{ templateText: string; blanks: BlankItem[] }[]>([]);
  const templateHistoryIdx = useRef(-1);
  const isUndoRedo = useRef(false);

  const pushTemplateHistory = (templateText: string, blanks: BlankItem[]) => {
    if (isUndoRedo.current) return;
    const hist = templateHistory.current;
    const idx = templateHistoryIdx.current;
    if (idx < hist.length - 1) hist.splice(idx + 1);
    hist.push({ templateText, blanks: blanks.map((b) => ({ ...b })) });
    if (hist.length > 100) hist.shift();
    templateHistoryIdx.current = hist.length - 1;
  };

  const templateUndo = () => {
    const hist = templateHistory.current;
    const idx = templateHistoryIdx.current;
    if (idx <= 0) return;
    isUndoRedo.current = true;
    templateHistoryIdx.current = idx - 1;
    const snapshot = hist[idx - 1];
    setBlankForm((prev) => ({ ...prev, templateText: snapshot.templateText, blanks: snapshot.blanks }));
    setEditForm((p) => ({ ...p, fullContent: snapshot.templateText }));
    isUndoRedo.current = false;
  };

  const templateRedo = () => {
    const hist = templateHistory.current;
    const idx = templateHistoryIdx.current;
    if (idx >= hist.length - 1) return;
    isUndoRedo.current = true;
    templateHistoryIdx.current = idx + 1;
    const snapshot = hist[idx + 1];
    setBlankForm((prev) => ({ ...prev, templateText: snapshot.templateText, blanks: snapshot.blanks }));
    setEditForm((p) => ({ ...p, fullContent: snapshot.templateText }));
    isUndoRedo.current = false;
  };

  // Dirty tracking
  const blankDirty = (editingBlank || isNewBlank) ? JSON.stringify(blankForm) !== savedBlankForm : false;

  // Fetch blanks
  const fetchBlanks = async (conceptId: string) => {
    setBlanksLoading(true);
    try {
      const res = await fetch(`/api/concepts/${conceptId}/blanks?all=true`);
      const json = await res.json();
      setBlankExercises(json.data ?? []);
    } catch {
      setBlankExercises([]);
    } finally {
      setBlanksLoading(false);
    }
  };

  const resetBlanks = () => {
    setBlankExercises([]);
    setEditingBlank(null);
    setIsNewBlank(false);
  };

  const startEditBlank = (exercise: BlankExercise) => {
    setEditingBlank(exercise);
    const matches = [...exercise.templateText.matchAll(/\{\{(\d+)\}\}/g)];
    const seen = new Set<number>();
    const orderedPositions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); orderedPositions.push(pos); }
    }
    const blankMap = new Map(exercise.blanks.map((b) => [b.position, b]));
    const orderedBlanks = orderedPositions.map((pos) => { const b = blankMap.get(pos); return b ? { ...b, difficulty: (b as BlankItem).difficulty || 'easy' } : { position: pos, answer: '', hint: '', difficulty: 'easy' as BlankDifficulty }; });
    const form = { level: exercise.level, templateText: exercise.templateText, blanks: orderedBlanks };
    setBlankForm(form);
    setSavedBlankForm(JSON.stringify(form));
    setIsNewBlank(false);
    templateHistory.current = [{ templateText: form.templateText, blanks: form.blanks.map((b) => ({ ...b })) }];
    templateHistoryIdx.current = 0;
  };

  const startNewBlank = () => {
    setEditingBlank(null);
    const template = editForm.fullContent;
    const matches = [...template.matchAll(/\{\{(\d+)\}\}/g)];
    const seen = new Set<number>();
    const positions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); positions.push(pos); }
    }
    const blanks = positions.map((pos) => ({ position: pos, answer: '', hint: '', difficulty: 'easy' as BlankDifficulty }));
    const form = { level: 1, templateText: template, blanks };
    setBlankForm(form);
    setSavedBlankForm(JSON.stringify(form));
    setIsNewBlank(true);
    templateHistory.current = [{ templateText: template, blanks: blanks.map((b) => ({ ...b })) }];
    templateHistoryIdx.current = 0;
  };

  const cancelBlankEdit = () => {
    setEditingBlank(null);
    setIsNewBlank(false);
    if (editingConcept) fetchBlanks(editingConcept.id);
  };

  const syncBlanksFromTemplate = (template: string) => {
    const matches = [...template.matchAll(/\{\{(\d+)\}\}/g)];
    const seen = new Set<number>();
    const positions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); positions.push(pos); }
    }
    setBlankForm((prev) => {
      const existingMap = new Map(prev.blanks.map((b) => [b.position, b]));
      const synced = positions.map((pos) => existingMap.get(pos) ?? { position: pos, answer: '', hint: '', difficulty: 'easy' as BlankDifficulty });
      const next = { ...prev, templateText: template, blanks: synced };
      pushTemplateHistory(template, synced);
      return next;
    });
    setEditForm((p) => ({ ...p, fullContent: template }));
  };

  const convertSelectionToBlank = () => {
    const textarea = templateTextareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart === selectionEnd) return;
    const rawSelected = blankForm.templateText.slice(selectionStart, selectionEnd);
    if (!rawSelected.trim()) return;

    const markerPattern = /\{\{(\d+)\}\}/g;
    const childMarkers: { pos: number; matchStart: number; matchEnd: number }[] = [];
    let m;
    while ((m = markerPattern.exec(rawSelected)) !== null) {
      childMarkers.push({ pos: parseInt(m[1], 10), matchStart: m.index, matchEnd: m.index + m[0].length });
    }

    const existingPositions = blankForm.blanks.map((b) => b.position);
    const nextPos = existingPositions.length > 0 ? Math.max(...existingPositions) + 1 : 1;

    if (childMarkers.length === 0) {
      const selectedText = rawSelected.trim();
      const before = blankForm.templateText.slice(0, selectionStart);
      const after = blankForm.templateText.slice(selectionEnd);
      const newTemplate = before + `{{${nextPos}}}` + after;
      const newBlank: BlankItem = { position: nextPos, answer: selectedText, hint: getChosung(selectedText), difficulty: 'easy' };
      setBlankForm((prev) => {
        const newBlanks = [...prev.blanks, newBlank];
        pushTemplateHistory(newTemplate, newBlanks);
        return { ...prev, templateText: newTemplate, blanks: newBlanks };
      });
      setEditForm((p) => ({ ...p, fullContent: newTemplate }));
    } else {
      let fullAnswer = rawSelected;
      const children: BlankChild[] = [];
      for (let ci = childMarkers.length - 1; ci >= 0; ci--) {
        const cm = childMarkers[ci];
        const childBlank = blankForm.blanks.find((b) => b.position === cm.pos);
        const childAnswer = childBlank?.answer || '';
        fullAnswer = fullAnswer.slice(0, cm.matchStart) + childAnswer + fullAnswer.slice(cm.matchEnd);
      }
      fullAnswer = fullAnswer.trim();
      let rebuiltText = rawSelected;
      for (let ci = childMarkers.length - 1; ci >= 0; ci--) {
        const cm = childMarkers[ci];
        const childBlank = blankForm.blanks.find((b) => b.position === cm.pos);
        const childAnswer = childBlank?.answer || '';
        rebuiltText = rebuiltText.slice(0, cm.matchStart) + childAnswer + rebuiltText.slice(cm.matchEnd);
      }
      const trimOffset = rebuiltText.indexOf(rebuiltText.trim());
      for (const cm of childMarkers) {
        const childBlank = blankForm.blanks.find((b) => b.position === cm.pos);
        if (!childBlank) continue;
        const beforeChild = rawSelected.slice(0, cm.matchStart);
        let offsetInFull = beforeChild.length;
        for (const prev of childMarkers) {
          if (prev.matchStart < cm.matchStart) {
            const prevBlank = blankForm.blanks.find((b) => b.position === prev.pos);
            const prevAnswer = prevBlank?.answer || '';
            offsetInFull += prevAnswer.length - (prev.matchEnd - prev.matchStart);
          }
        }
        offsetInFull -= trimOffset;
        children.push({ position: childBlank.position, answer: childBlank.answer, hint: childBlank.hint, offset: offsetInFull, length: childBlank.answer.length });
      }
      const before = blankForm.templateText.slice(0, selectionStart);
      const after = blankForm.templateText.slice(selectionEnd);
      const newTemplate = before + `{{${nextPos}}}` + after;
      const remainingText = before + after;
      const absorbedPositions = new Set<number>();
      for (const cm of childMarkers) {
        if (!remainingText.includes(`{{${cm.pos}}}`)) absorbedPositions.add(cm.pos);
      }
      const newBlank: BlankItem = { position: nextPos, answer: fullAnswer, hint: getChosung(fullAnswer), difficulty: 'hard', children };
      setBlankForm((prev) => {
        const newBlanks = [...prev.blanks.filter((b) => !absorbedPositions.has(b.position)), newBlank];
        pushTemplateHistory(newTemplate, newBlanks);
        return { ...prev, templateText: newTemplate, blanks: newBlanks };
      });
      setEditForm((p) => ({ ...p, fullContent: newTemplate }));
    }
  };

  const updateBlankItem = (position: number, field: 'answer' | 'hint' | 'difficulty', value: string) => {
    setBlankForm((prev) => ({
      ...prev,
      blanks: prev.blanks.map((b) => {
        if (b.position !== position) return b;
        if (field === 'answer') return { ...b, answer: value, hint: getChosung(value) };
        return { ...b, [field]: value };
      }),
    }));
  };

  const autoRenumber = () => {
    setBlankForm((prev) => {
      const matches = [...prev.templateText.matchAll(/\{\{(\d+)\}\}/g)];
      const seen = new Set<number>();
      const oldOrder: number[] = [];
      for (const m of matches) {
        const pos = parseInt(m[1], 10);
        if (!seen.has(pos)) { seen.add(pos); oldOrder.push(pos); }
      }
      const mapping = new Map<number, number>();
      oldOrder.forEach((oldPos, i) => mapping.set(oldPos, i + 1));
      const newTemplate = prev.templateText.replace(/\{\{(\d+)\}\}/g, (_, n) => {
        const oldPos = parseInt(n, 10);
        return `{{${mapping.get(oldPos) ?? oldPos}}}`;
      });
      const newBlanks = prev.blanks.map((b) => ({ ...b, position: mapping.get(b.position) ?? b.position })).sort((a, b) => a.position - b.position);
      return { ...prev, templateText: newTemplate, blanks: newBlanks };
    });
  };

  const handleBlankDrop = (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }
    setBlankForm((prev) => {
      const newBlanks = [...prev.blanks];
      const [moved] = newBlanks.splice(dragIdx, 1);
      newBlanks.splice(dropIdx, 0, moved);
      const oldPositions = prev.blanks.map((b) => b.position);
      const newPositions = newBlanks.map((b) => b.position);
      const mapping = new Map<number, number>();
      oldPositions.forEach((oldPos, i) => mapping.set(oldPos, newPositions[i]));
      const reIndexed = newBlanks.map((b, i) => ({ ...b, position: oldPositions[i] }));
      const newTemplate = prev.templateText.replace(/\{\{(\d+)\}\}/g, (_, n) => {
        const oldPos = parseInt(n, 10);
        return `{{${mapping.get(oldPos) ?? oldPos}}}`;
      });
      return { ...prev, templateText: newTemplate, blanks: reIndexed };
    });
    setDragIdx(null);
  };

  const saveBlankExercise = async () => {
    if (!editingConcept) return;
    if (!blankForm.templateText.trim()) return;
    if (blankForm.blanks.some((b) => !b.answer.trim())) return;
    setBlankSaving(true);
    try {
      if (isNewBlank) {
        const res = await fetch(`/api/concepts/${editingConcept.id}/blanks`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blankForm),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.id) {
            setEditingBlank({ id: json.data.id, conceptId: editingConcept.id, ...blankForm });
            setIsNewBlank(false);
          }
        }
      } else if (editingBlank) {
        const putRes = await fetch(`/api/concepts/${editingConcept.id}/blanks`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseId: editingBlank.id, ...blankForm }),
        });
        if (!putRes.ok) { toast.error('빈칸 문제 저장에 실패했습니다.'); return; }
      }
      await fetchBlanks(editingConcept.id);
      setSavedBlankForm(JSON.stringify(blankForm));
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setBlankSaving(false);
    }
  };

  const deleteBlankExercise = async (exerciseId: string) => {
    if (!editingConcept) return;
    if (!(await confirm({ message: '이 빈칸 문제를 삭제하시겠습니까?', variant: 'danger', confirmLabel: '삭제' }))) return;
    try {
      const res = await fetch(`/api/concepts/${editingConcept.id}/blanks?exerciseId=${exerciseId}`, { method: 'DELETE' });
      if (!res.ok) toast.error('삭제에 실패했습니다.');
      await fetchBlanks(editingConcept.id);
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const removeBlankFromForm = (b: BlankItem) => {
    const marker = `{{${b.position}}}`;
    let restored = b.answer || '';
    const restoredChildren: BlankItem[] = [];
    if (b.children && b.children.length > 0) {
      const sortedChildren = [...b.children].sort((a, c) => c.offset - a.offset);
      for (const child of sortedChildren) {
        restored = restored.slice(0, child.offset) + `{{${child.position}}}` + restored.slice(child.offset + child.length);
      }
      for (const child of b.children) {
        restoredChildren.push({ position: child.position, answer: child.answer, hint: child.hint, difficulty: 'easy' });
      }
    }
    const newTemplate = blankForm.templateText.replaceAll(marker, restored);
    const newBlanks = [...blankForm.blanks.filter((bl) => bl.position !== b.position), ...restoredChildren];
    pushTemplateHistory(newTemplate, newBlanks);
    setBlankForm((prev) => ({ ...prev, templateText: newTemplate, blanks: newBlanks }));
    setEditForm((p) => ({ ...p, fullContent: newTemplate }));
  };

  return {
    blankExercises, blanksLoading, editingBlank, setEditingBlank,
    blankForm, setBlankForm, isNewBlank, setIsNewBlank, blankSaving,
    savedBlankForm, setSavedBlankForm,
    dragIdx, setDragIdx,
    templateViewMode, setTemplateViewMode,
    templateMathPopup, setTemplateMathPopup,
    editingBlankPos, setEditingBlankPos,
    previewOriginalOpen, setPreviewOriginalOpen,
    previewStudentOpen, setPreviewStudentOpen,
    templateHighlightRef, templateTextareaRef,
    blankDirty,
    fetchBlanks, resetBlanks,
    startEditBlank, startNewBlank, cancelBlankEdit,
    syncBlanksFromTemplate, convertSelectionToBlank,
    updateBlankItem, autoRenumber, handleBlankDrop,
    saveBlankExercise, deleteBlankExercise, removeBlankFromForm,
    pushTemplateHistory, templateUndo, templateRedo,
  };
}

export type BlankEditorReturn = ReturnType<typeof useBlankEditor>;
