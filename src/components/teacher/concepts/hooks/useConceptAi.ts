'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { getCurriculumForGrade } from '@/lib/utils/curriculumMapping';
import { GRADE_LABELS, PART_LABELS } from '@/lib/constants/labels';
import type { AiMetadataSuggestion, BlankItem, BlankExercise, EditFormState } from '../types';
import type { BlankDifficulty } from '../types';

const GRADE_OPTIONS = Object.keys(GRADE_LABELS);
const PART_OPTIONS = Object.keys(PART_LABELS);

interface AiDeps {
  editingConcept: { id: string } | null;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  blankExercises: BlankExercise[];
  setBlankForm: React.Dispatch<React.SetStateAction<{ level: number; templateText: string; blanks: BlankItem[] }>>;
  setSavedBlankForm: (v: string) => void;
  setEditingBlank: (v: BlankExercise | null) => void;
  setIsNewBlank: (v: boolean) => void;
  templateHistoryRef: React.MutableRefObject<{ templateText: string; blanks: BlankItem[] }[]>;
  templateHistoryIdxRef: React.MutableRefObject<number>;
}

export function useConceptAi(deps: AiDeps) {
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showBlankGenOptions, setShowBlankGenOptions] = useState(false);
  const [aiMetadataLoading, setAiMetadataLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiMetadataSuggestion[] | null>(null);

  const validateContentForAi = (content: string): string | null => {
    const trimmed = content.trim();
    if (trimmed.length < 20) return '개념 내용이 너무 짧습니다 (최소 20자).';
    const koreanChars = (trimmed.match(/[가-힣]/g) || []).length;
    if (koreanChars < 5) return '한국어 수학 개념 내용을 입력하세요.';
    const words = trimmed.split(/\s+/).filter(w => w.length >= 2);
    if (words.length < 3) return '내용이 너무 짧습니다. 문장 형태로 입력하세요.';
    return null;
  };

  const handleAiMetadataExtract = async () => {
    const validationError = validateContentForAi(deps.editForm.fullContent);
    if (validationError) { toast.warning(validationError); return; }

    const filledFields = [deps.editForm.grade, deps.editForm.semester, deps.editForm.chapter, deps.editForm.part, deps.editForm.keywords].filter(Boolean);
    if (filledFields.length >= 5) {
      if (!(await confirm({ message: '모든 메타데이터가 이미 채워져 있습니다. AI 분류를 다시 실행하시겠습니까?', variant: 'info', confirmLabel: '실행' }))) return;
    }

    setAiMetadataLoading(true);
    try {
      const res = await fetch('/api/concepts/extract-metadata', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: deps.editForm.title, fullContent: deps.editForm.fullContent, currentKeywords: deps.editForm.keywords || '' }),
      });
      if (!res.ok) throw new Error('AI extraction failed');
      const json = await res.json();
      const meta = json.data as {
        title: string; grade: string; semester: number;
        chapter: string; section: string; part: string; keywords: string;
        correctedContent: string; corrections: { original: string; corrected: string; reason: string }[];
      };

      const gradeCode = GRADE_OPTIONS.includes(meta.grade) ? meta.grade : '';

      let matchedChapter = '';
      let matchedSection = '';
      if (gradeCode) {
        const entries = getCurriculumForGrade(gradeCode);
        const isHigh = gradeCode.startsWith('high_');
        const entry = isHigh ? entries[0] : entries.find(e => e.semesterNumber === meta.semester);
        if (entry) {
          const ch = entry.chapters.find(c => c.name === meta.chapter) || entry.chapters.find(c => meta.chapter.includes(c.name) || c.name.includes(meta.chapter));
          if (ch) {
            matchedChapter = ch.name;
            if (meta.section && ch.subUnits) {
              const sec = ch.subUnits.find(s => s.name === meta.section) || ch.subUnits.find(s => meta.section.includes(s.name) || s.name.includes(meta.section));
              if (sec) matchedSection = sec.name;
            }
          }
        }
      }

      const validPart = PART_OPTIONS.includes(meta.part) ? meta.part : '';

      const proposed: { field: string; label: string; raw: string | number; display: string }[] = [];
      if (meta.title) proposed.push({ field: 'title', label: '제목', raw: meta.title, display: meta.title });
      if (gradeCode) proposed.push({ field: 'grade', label: '학년', raw: gradeCode, display: GRADE_LABELS[gradeCode] || gradeCode });
      if (meta.semester) proposed.push({ field: 'semester', label: '학기', raw: meta.semester, display: `${meta.semester}학기` });
      if (matchedChapter) proposed.push({ field: 'chapter', label: '대단원', raw: matchedChapter, display: matchedChapter });
      if (matchedSection) proposed.push({ field: 'section', label: '중단원', raw: matchedSection, display: matchedSection });
      if (validPart) proposed.push({ field: 'part', label: '영역', raw: validPart, display: PART_LABELS[validPart] || validPart });
      if (meta.keywords) proposed.push({ field: 'keywords', label: '키워드', raw: meta.keywords, display: meta.keywords });

      if (meta.correctedContent && meta.correctedContent.trim() && meta.corrections?.length > 0) {
        const correctionSummary = meta.corrections.map(c => `${c.original} → ${c.corrected}`).join(', ');
        proposed.push({ field: 'fullContent', label: '맞춤법 교정', raw: meta.correctedContent, display: `${meta.corrections.length}건: ${correctionSummary}` });
      }

      const autoApply: Partial<EditFormState> = {};
      const diffs: AiMetadataSuggestion[] = [];

      for (const p of proposed) {
        const currentRaw = deps.editForm[p.field as keyof EditFormState];
        const currentStr = currentRaw == null ? '' : String(currentRaw);
        const suggestedStr = String(p.raw);

        if (p.field === 'fullContent') {
          if (currentStr !== suggestedStr) {
            diffs.push({ field: p.field, label: p.label, currentDisplay: '현재 내용', suggestedDisplay: p.display, suggestedRaw: p.raw, checked: true });
          }
          continue;
        }

        const isSameValue = p.field === 'keywords'
          ? new Set(currentStr.split(',').map(s => s.trim()).filter(Boolean)).size === new Set(suggestedStr.split(',').map(s => s.trim()).filter(Boolean)).size
            && currentStr.split(',').map(s => s.trim()).filter(Boolean).every(k => suggestedStr.split(',').map(s => s.trim()).includes(k))
          : currentStr === suggestedStr;

        if (!currentStr || currentStr === '0') {
          autoApply[p.field as keyof EditFormState] = p.raw as never;
        } else if (!isSameValue) {
          let currentDisplay = currentStr;
          if (p.field === 'grade') currentDisplay = GRADE_LABELS[currentStr] || currentStr;
          else if (p.field === 'part') currentDisplay = PART_LABELS[currentStr] || currentStr;
          else if (p.field === 'semester') currentDisplay = `${currentStr}학기`;
          diffs.push({ field: p.field, label: p.label, currentDisplay, suggestedDisplay: p.display, suggestedRaw: p.raw, checked: true });
        }
      }

      if (Object.keys(autoApply).length > 0) {
        deps.setEditForm((prev) => ({ ...prev, ...autoApply }));
      }

      if (diffs.length > 0) {
        setAiSuggestions(diffs);
      } else if (Object.keys(autoApply).length === 0) {
        toast.info('AI 분석 결과가 현재 값과 동일합니다.');
      }
    } catch {
      toast.error('AI 메타데이터 추출에 실패했습니다.');
    } finally {
      setAiMetadataLoading(false);
    }
  };

  const handleApplyAiSuggestions = () => {
    if (!aiSuggestions) return;
    const updates: Partial<EditFormState> = {};
    for (const s of aiSuggestions) {
      if (s.checked) updates[s.field as keyof EditFormState] = s.suggestedRaw as never;
    }
    if (Object.keys(updates).length > 0) {
      deps.setEditForm((prev) => ({ ...prev, ...updates }));
    }
    setAiSuggestions(null);
  };

  const handleAiBlankGenerate = async (mergeSameTerms: boolean) => {
    if (!deps.editingConcept) return;
    setShowBlankGenOptions(false);
    const validationError = validateContentForAi(deps.editForm.fullContent);
    if (validationError) { toast.warning(validationError); return; }
    setAiGenerating(true);
    try {
      const res = await fetch('/api/concepts/bulk/extract-blanks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ title: deps.editForm.title, fullContent: deps.editForm.fullContent }], mergeSameTerms }),
      });
      if (!res.ok) throw new Error('AI extraction failed');
      const json = await res.json();
      const result = json.data?.[0] as { templateText: string; blanks: { position: number; answer: string; hint: string; difficulty: string }[] } | undefined;

      if (!result || !result.templateText || result.blanks.length === 0) {
        toast.warning('AI가 빈칸을 추출하지 못했습니다. 내용이 충분한지 확인하세요.');
        return;
      }

      const blanks: BlankItem[] = result.blanks.map((b) => ({
        position: b.position, answer: b.answer, hint: b.hint,
        difficulty: (b.difficulty === 'hard' ? 'hard' : b.difficulty === 'full' ? 'full' : 'easy') as BlankDifficulty,
      }));

      const form = { level: 1, templateText: result.templateText, blanks };
      deps.setBlankForm(form);
      deps.setSavedBlankForm('');
      deps.setEditForm((p) => ({ ...p, fullContent: result.templateText }));

      if (deps.blankExercises.length > 0) {
        deps.setEditingBlank(deps.blankExercises[0]);
        deps.setIsNewBlank(false);
      } else {
        deps.setEditingBlank(null);
        deps.setIsNewBlank(true);
      }

      deps.templateHistoryRef.current = [{ templateText: result.templateText, blanks: blanks.map((b) => ({ ...b })) }];
      deps.templateHistoryIdxRef.current = 0;
    } catch {
      toast.error('AI 빈칸 추출에 실패했습니다.');
    } finally {
      setAiGenerating(false);
    }
  };

  return {
    aiGenerating, showBlankGenOptions, setShowBlankGenOptions,
    aiMetadataLoading, aiSuggestions, setAiSuggestions,
    handleAiMetadataExtract, handleApplyAiSuggestions, handleAiBlankGenerate,
  };
}

export type ConceptAiReturn = ReturnType<typeof useConceptAi>;
