#!/usr/bin/env python3
"""Apply all UI changes to concepts page:
1. fullContent/templateText merge
2. Preview collapse/expand
3. Template text area enlargement + overlap fix
4. Easy/Hard blank distinction
5. Button unification (footer only)
6. Save without close + dirty tracking
7. KaTeX rendering prep
"""

import re

FILE = r'd:\mathlab\src\app\(teacher)\concepts\page.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. Add 'Eye' to lucide-react import if not present, add ChevronUp
# ============================================================
# Already has Eye, ChevronRight, ChevronDown - need to check ChevronUp
if 'ChevronUp' not in content:
    content = content.replace(
        "  ChevronDown,\n} from 'lucide-react';",
        "  ChevronDown,\n  ChevronUp,\n} from 'lucide-react';"
    )

# ============================================================
# 2. Add states: previewOpen, savedEditForm, savedBlankForm, dirty tracking
# ============================================================
old_states = """  // Exercise expand state
  const [expandedExIds, setExpandedExIds] = useState<Set<string>>(new Set());
  const toggleExExpand = (id: string) => {
    setExpandedExIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };"""

new_states = """  // Exercise expand state
  const [expandedExIds, setExpandedExIds] = useState<Set<string>>(new Set());
  const toggleExExpand = (id: string) => {
    setExpandedExIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Preview collapse state (default collapsed)
  const [previewOpen, setPreviewOpen] = useState(false);

  // Dirty state tracking — compare current form JSON with saved snapshot
  const [savedEditForm, setSavedEditForm] = useState('');
  const [savedBlankForm, setSavedBlankForm] = useState('');
  const conceptDirty = editingConcept ? JSON.stringify(editForm) !== savedEditForm : false;
  const blankDirty = (editingBlank || isNewBlank) ? JSON.stringify(blankForm) !== savedBlankForm : false;
  const isDirty = conceptDirty || blankDirty;"""

content = content.replace(old_states, new_states)

# ============================================================
# 3. Modify startEditing — save initial form snapshot
# ============================================================
old_startEditing = """  const startEditing = (concept: ConceptItem) => {
    setEditingConcept(concept);
    setIsNewConcept(false);
    setEditForm({
      subjectId: concept.subjectId,
      title: concept.title,
      fullContent: concept.fullContent,
      conceptCode: concept.conceptCode,
      grade: concept.grade,
      category: concept.category,
      part: concept.part,
      keywords: concept.keywords ?? '',
    });
    setEditPrereqs(concept.prerequisites ?? []);
    setPrereqSearch('');
    setPrereqResults([]);
    // Fetch blank exercises
    setBlankExercises([]);
    setEditingBlank(null);
    setIsNewBlank(false);
    fetchBlanks(concept.id);
  };"""

new_startEditing = """  const startEditing = (concept: ConceptItem) => {
    setEditingConcept(concept);
    setIsNewConcept(false);
    const form = {
      subjectId: concept.subjectId,
      title: concept.title,
      fullContent: concept.fullContent,
      conceptCode: concept.conceptCode,
      grade: concept.grade,
      category: concept.category,
      part: concept.part,
      keywords: concept.keywords ?? '',
    };
    setEditForm(form);
    setSavedEditForm(JSON.stringify(form));
    setEditPrereqs(concept.prerequisites ?? []);
    setPrereqSearch('');
    setPrereqResults([]);
    // Fetch blank exercises
    setBlankExercises([]);
    setEditingBlank(null);
    setIsNewBlank(false);
    fetchBlanks(concept.id);
  };"""

content = content.replace(old_startEditing, new_startEditing)

# ============================================================
# 4. Modify startNewConcept — save initial form snapshot
# ============================================================
old_startNew = """  const startNewConcept = () => {
    setEditingConcept({ id: '__new__', subjectId: '', conceptCode: '', title: '', fullContent: '', grade: GRADE_OPTIONS[0], category: CATEGORY_OPTIONS[0], part: PART_OPTIONS[0], keywords: null, prerequisites: [], subConcepts: [] });
    setIsNewConcept(true);
    setEditForm({
      subjectId: subjects[0]?.id ?? '',
      title: '',
      fullContent: '',
      conceptCode: '',
      grade: GRADE_OPTIONS[0],
      category: CATEGORY_OPTIONS[0],
      part: PART_OPTIONS[0],
      keywords: '',
    });
    setEditPrereqs([]);
    setPrereqSearch('');
    setPrereqResults([]);
    setBlankExercises([]);
    setEditingBlank(null);
    setIsNewBlank(false);
  };"""

new_startNew = """  const startNewConcept = () => {
    setEditingConcept({ id: '__new__', subjectId: '', conceptCode: '', title: '', fullContent: '', grade: GRADE_OPTIONS[0], category: CATEGORY_OPTIONS[0], part: PART_OPTIONS[0], keywords: null, prerequisites: [], subConcepts: [] });
    setIsNewConcept(true);
    const form = {
      subjectId: subjects[0]?.id ?? '',
      title: '',
      fullContent: '',
      conceptCode: '',
      grade: GRADE_OPTIONS[0],
      category: CATEGORY_OPTIONS[0],
      part: PART_OPTIONS[0],
      keywords: '',
    };
    setEditForm(form);
    setSavedEditForm(JSON.stringify(form));
    setEditPrereqs([]);
    setPrereqSearch('');
    setPrereqResults([]);
    setBlankExercises([]);
    setEditingBlank(null);
    setIsNewBlank(false);
  };"""

content = content.replace(old_startNew, new_startNew)

# ============================================================
# 5. Modify cancelEditing — warn if dirty
# ============================================================
old_cancel = """  const cancelEditing = () => {
    setEditingConcept(null);
    setIsNewConcept(false);
  };"""

new_cancel = """  const cancelEditing = () => {
    if (isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) return;
    setEditingConcept(null);
    setIsNewConcept(false);
    setEditingBlank(null);
    setIsNewBlank(false);
  };"""

content = content.replace(old_cancel, new_cancel)

# ============================================================
# 6. Modify saveConcept — don't close, reset dirty
# ============================================================
old_saveConcept_new = """        if (res.ok) {
          setEditingConcept(null);
          setIsNewConcept(false);
          fetchConcepts();
        }
      } else {"""

new_saveConcept_new = """        if (res.ok) {
          setSavedEditForm(JSON.stringify(editForm));
          setEditingConcept(null);
          setIsNewConcept(false);
          fetchConcepts();
        }
      } else {"""

content = content.replace(old_saveConcept_new, new_saveConcept_new)

old_saveConcept_update = """        if (res.ok) {
          setEditingConcept(null);
          fetchConcepts();
        }"""

new_saveConcept_update = """        if (res.ok) {
          setSavedEditForm(JSON.stringify(editForm));
          fetchConcepts();
        }"""

content = content.replace(old_saveConcept_update, new_saveConcept_update)

# ============================================================
# 7. Modify startEditBlank — save initial form
# ============================================================
old_startEditBlank = """  const startEditBlank = (exercise: BlankExercise) => {
    setEditingBlank(exercise);
    // 템플릿 내 등장 순서로 정렬
    const matches = [...exercise.templateText.matchAll(/\\{\\{(\\d+)\\}\\}/g)];
    const seen = new Set<number>();
    const orderedPositions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); orderedPositions.push(pos); }
    }
    const blankMap = new Map(exercise.blanks.map((b) => [b.position, b]));
    const orderedBlanks = orderedPositions.map((pos) => blankMap.get(pos) ?? { position: pos, answer: '', hint: '' });
    setBlankForm({
      level: exercise.level,
      templateText: exercise.templateText,
      blanks: orderedBlanks,
    });
    setIsNewBlank(false);
  };"""

new_startEditBlank = """  const startEditBlank = (exercise: BlankExercise) => {
    setEditingBlank(exercise);
    // 템플릿 내 등장 순서로 정렬
    const matches = [...exercise.templateText.matchAll(/\\{\\{(\\d+)\\}\\}/g)];
    const seen = new Set<number>();
    const orderedPositions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); orderedPositions.push(pos); }
    }
    const blankMap = new Map(exercise.blanks.map((b) => [b.position, b]));
    const orderedBlanks = orderedPositions.map((pos) => blankMap.get(pos) ?? { position: pos, answer: '', hint: '' });
    const form = {
      level: exercise.level,
      templateText: exercise.templateText,
      blanks: orderedBlanks,
    };
    setBlankForm(form);
    setSavedBlankForm(JSON.stringify(form));
    setIsNewBlank(false);
  };"""

content = content.replace(old_startEditBlank, new_startEditBlank)

# ============================================================
# 8. Modify startNewBlank — pre-fill from fullContent
# ============================================================
old_startNewBlank = """  const startNewBlank = () => {
    setEditingBlank(null);
    setBlankForm({ level: 1, templateText: '', blanks: [] });
    setIsNewBlank(true);
  };"""

new_startNewBlank = """  const startNewBlank = () => {
    setEditingBlank(null);
    // Pre-fill template from fullContent (merge)
    const template = editForm.fullContent;
    const matches = [...template.matchAll(/\\{\\{(\\d+)\\}\\}/g)];
    const seen = new Set<number>();
    const positions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); positions.push(pos); }
    }
    const blanks = positions.map((pos) => ({ position: pos, answer: '', hint: '' }));
    const form = { level: 1, templateText: template, blanks };
    setBlankForm(form);
    setSavedBlankForm(JSON.stringify(form));
    setIsNewBlank(true);
  };"""

content = content.replace(old_startNewBlank, new_startNewBlank)

# ============================================================
# 9. Modify syncBlanksFromTemplate — also update fullContent
# ============================================================
old_sync = """  // Auto-detect {{N}} placeholders and sync blanks array (등장 순서 유지)
  const syncBlanksFromTemplate = (template: string) => {
    const matches = [...template.matchAll(/\\{\\{(\\d+)\\}\\}/g)];
    const seen = new Set<number>();
    const positions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); positions.push(pos); }
    }
    setBlankForm((prev) => {
      const existingMap = new Map(prev.blanks.map((b) => [b.position, b]));
      const synced = positions.map((pos) => existingMap.get(pos) ?? { position: pos, answer: '', hint: '' });
      return { ...prev, templateText: template, blanks: synced };
    });
  };"""

new_sync = """  // Auto-detect {{N}} placeholders and sync blanks array (등장 순서 유지)
  const syncBlanksFromTemplate = (template: string) => {
    const matches = [...template.matchAll(/\\{\\{(\\d+)\\}\\}/g)];
    const seen = new Set<number>();
    const positions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); positions.push(pos); }
    }
    setBlankForm((prev) => {
      const existingMap = new Map(prev.blanks.map((b) => [b.position, b]));
      const synced = positions.map((pos) => existingMap.get(pos) ?? { position: pos, answer: '', hint: '' });
      return { ...prev, templateText: template, blanks: synced };
    });
    // Sync template text to fullContent (merged field)
    setEditForm((p) => ({ ...p, fullContent: template }));
  };"""

content = content.replace(old_sync, new_sync)

# ============================================================
# 10. Modify saveBlankExercise — don't close, stay in edit mode
# ============================================================
old_saveBlank = """  const saveBlankExercise = async () => {
    if (!editingConcept) return;
    if (!blankForm.templateText.trim()) return;
    if (blankForm.blanks.some((b) => !b.answer.trim())) return;

    setBlankSaving(true);
    try {
      if (isNewBlank) {
        await fetch(`/api/concepts/${editingConcept.id}/blanks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blankForm),
        });
      } else if (editingBlank) {
        await fetch(`/api/concepts/${editingConcept.id}/blanks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseId: editingBlank.id, ...blankForm }),
        });
      }
      await fetchBlanks(editingConcept.id);
      setEditingBlank(null);
      setIsNewBlank(false);
    } catch {
      // silently fail
    } finally {
      setBlankSaving(false);
    }
  };"""

new_saveBlank = """  const saveBlankExercise = async () => {
    if (!editingConcept) return;
    if (!blankForm.templateText.trim()) return;
    if (blankForm.blanks.some((b) => !b.answer.trim())) return;

    setBlankSaving(true);
    try {
      if (isNewBlank) {
        const res = await fetch(`/api/concepts/${editingConcept.id}/blanks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        await fetch(`/api/concepts/${editingConcept.id}/blanks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseId: editingBlank.id, ...blankForm }),
        });
      }
      await fetchBlanks(editingConcept.id);
      setSavedBlankForm(JSON.stringify(blankForm));
      // Don't close — stay in editing mode
    } catch {
      // silently fail
    } finally {
      setBlankSaving(false);
    }
  };"""

content = content.replace(old_saveBlank, new_saveBlank)

# ============================================================
# 11. Column 1: Hide fullContent when editing blanks
# ============================================================
old_fullContent = """                  {/* Full Content */}
                  <div>
                    <label className="block text-xs font-bold mb-1 text-text-secondary">개념 내용</label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[120px] resize-y disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.fullContent}
                      onChange={(e) => setEditForm((p) => ({ ...p, fullContent: e.target.value }))}
                      disabled={!isAdmin}
                    />
                  </div>"""

new_fullContent = """                  {/* Full Content — hidden when editing blanks (merged with template text) */}
                  {!((isNewBlank || editingBlank) && !isNewConcept) && (
                    <div>
                      <label className="block text-xs font-bold mb-1 text-text-secondary">개념 내용</label>
                      <textarea
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[120px] resize-y disabled:bg-slate-50 disabled:text-text-secondary"
                        value={editForm.fullContent}
                        onChange={(e) => setEditForm((p) => ({ ...p, fullContent: e.target.value }))}
                        disabled={!isAdmin}
                      />
                    </div>
                  )}"""

content = content.replace(old_fullContent, new_fullContent)

# ============================================================
# 12. Column 2: Template area enlargement + overlay fix + preview collapse
# ============================================================
old_column2_template = """                      {/* Template text with highlight overlay */}
                      <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-bold mb-1 text-text-secondary">
                          템플릿 텍스트
                          {isAdmin && (
                            <span className="font-normal ml-1">
                              {'{{1}}, {{2}} 형식으로 빈칸 위치 지정'}
                            </span>
                          )}
                        </label>
                        <div className="relative flex-1">
                          <textarea
                            className="relative z-10 w-full min-h-[160px] resize-none px-3 py-2 text-sm leading-relaxed bg-transparent border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50/50 disabled:text-text-secondary"
                            style={{ color: 'transparent', caretColor: '#1e293b', WebkitTextFillColor: 'transparent' }}
                            value={blankForm.templateText}
                            onChange={(e) => syncBlanksFromTemplate(e.target.value)}
                            onScroll={(e) => {
                              if (templateHighlightRef.current) {
                                templateHighlightRef.current.scrollTop = e.currentTarget.scrollTop;
                              }
                            }}
                            disabled={!isAdmin}
                          />
                          <div
                            ref={templateHighlightRef}
                            className="absolute inset-0 z-0 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden pointer-events-none rounded-lg"
                            aria-hidden="true"
                          >
                            {blankForm.templateText ? (
                              blankForm.templateText.split(/(\\{\\{\\d+\\}\\})/).map((part, i) =>
                                /^\\{\\{\\d+\\}\\}$/.test(part) ? (
                                  <mark key={i} className="bg-amber-200/80 text-amber-900 font-semibold rounded-sm px-0.5">{part}</mark>
                                ) : (
                                  <span key={i}>{part}</span>
                                )
                              )
                            ) : (
                              <span className="text-slate-400">분수는 전체를 똑같이 나눈 것 중 {'{{1}}'}를 나타내는 수입니다.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Live dual preview */}
                      {blankForm.templateText && blankForm.blanks.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">원본 (정답 포함)</div>
                            <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                              {blankForm.templateText.split(/(\\{\\{\\d+\\}\\})/).map((part, i) =>
                                /^\\{\\{\\d+\\}\\}$/.test(part) ? (
                                  <span key={i} className="inline-flex items-center mx-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold">
                                    {(() => { const n = part.match(/\\d+/)?.[0]; const blank = blankForm.blanks.find((b) => b.position === parseInt(n ?? '0', 10)); return blank?.answer || '?'; })()}
                                  </span>
                                ) : <span key={i}>{part}</span>
                              )}
                            </p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">학생 화면</div>
                            <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                              {blankForm.templateText.split(/(\\{\\{\\d+\\}\\})/).map((part, i) =>
                                /^\\{\\{\\d+\\}\\}$/.test(part) ? (
                                  <span key={i} className="inline-block min-w-[2.5em] border-b-2 border-blue-400 mx-0.5 text-center text-[10px] text-blue-400">{part.match(/\\d+/)?.[0]}</span>
                                ) : <span key={i}>{part}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}"""

new_column2_template = """                      {/* Template text with highlight overlay — enlarged */}
                      <div className="flex-1 flex flex-col min-h-0">
                        <label className="block text-xs font-bold mb-1 text-text-secondary">
                          개념 내용 / 템플릿
                          {isAdmin && (
                            <span className="font-normal ml-1 text-slate-400">
                              {'{{1}}, {{2}} 형식으로 빈칸 위치 지정'}
                            </span>
                          )}
                        </label>
                        <div className="relative flex-1 min-h-[280px]">
                          <textarea
                            className="absolute inset-0 z-10 w-full h-full resize-none px-3 py-2 text-sm leading-relaxed bg-transparent border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50/50 disabled:text-text-secondary"
                            style={{ color: 'transparent', caretColor: '#1e293b', WebkitTextFillColor: 'transparent' }}
                            value={blankForm.templateText}
                            onChange={(e) => syncBlanksFromTemplate(e.target.value)}
                            onScroll={(e) => {
                              if (templateHighlightRef.current) {
                                templateHighlightRef.current.scrollTop = e.currentTarget.scrollTop;
                              }
                            }}
                            disabled={!isAdmin}
                          />
                          <div
                            ref={templateHighlightRef}
                            className="absolute inset-0 z-0 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-y-auto pointer-events-none rounded-lg border border-transparent"
                            aria-hidden="true"
                          >
                            {blankForm.templateText ? (
                              blankForm.templateText.split(/(\\{\\{\\d+\\}\\})/).map((part, i) =>
                                /^\\{\\{\\d+\\}\\}$/.test(part) ? (
                                  <mark key={i} className="bg-amber-200/80 text-amber-900 font-semibold rounded-sm px-0.5">{part}</mark>
                                ) : (
                                  <span key={i}>{part}</span>
                                )
                              )
                            ) : (
                              <span className="text-slate-400">분수는 전체를 똑같이 나눈 것 중 {'{{1}}'}를 나타내는 수입니다.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Live dual preview — collapsible */}
                      {blankForm.templateText && blankForm.blanks.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setPreviewOpen((p) => !p)}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-wider mb-1"
                          >
                            {previewOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            미리보기
                          </button>
                          {previewOpen && (
                            <div className="flex flex-col gap-2">
                              <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">원본 (정답 포함)</div>
                                <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                                  {blankForm.templateText.split(/(\\{\\{\\d+\\}\\})/).map((part, i) =>
                                    /^\\{\\{\\d+\\}\\}$/.test(part) ? (
                                      <span key={i} className="inline-flex items-center mx-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold">
                                        {(() => { const n = part.match(/\\d+/)?.[0]; const blank = blankForm.blanks.find((b) => b.position === parseInt(n ?? '0', 10)); return blank?.answer || '?'; })()}
                                      </span>
                                    ) : <span key={i}>{part}</span>
                                  )}
                                </p>
                              </div>
                              <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">학생 화면</div>
                                <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                                  {blankForm.templateText.split(/(\\{\\{\\d+\\}\\})/).map((part, i) =>
                                    /^\\{\\{\\d+\\}\\}$/.test(part) ? (
                                      <span key={i} className="inline-block min-w-[2.5em] border-b-2 border-blue-400 mx-0.5 text-center text-[10px] text-blue-400">{part.match(/\\d+/)?.[0]}</span>
                                    ) : <span key={i}>{part}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}"""

content = content.replace(old_column2_template, new_column2_template)

# ============================================================
# 13. Column 3: Level badge + remove bottom action buttons
# ============================================================
old_column3_header = """                    {/* ===== Column 3: 정답 & 힌트 ===== */}
                    <div className="px-5 py-5 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                          정답 & 힌트 ({blankForm.blanks.length}개)
                        </h3>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={autoRenumber}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="등장 순서대로 1, 2, 3... 재번호"
                          >
                            <RefreshCw className="w-3 h-3" />
                            자동 정렬
                          </button>
                        )}
                      </div>"""

new_column3_header = """                    {/* ===== Column 3: 정답 & 힌트 ===== */}
                    <div className="px-5 py-5 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                            정답 & 힌트 ({blankForm.blanks.length}개)
                          </h3>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${blankForm.level === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {blankForm.level === 1 ? '쉬움' : '어려움'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={autoRenumber}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                              title="등장 순서대로 1, 2, 3... 재번호"
                            >
                              <RefreshCw className="w-3 h-3" />
                              자동 정렬
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={cancelBlankEdit}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                            title="목록으로 돌아가기"
                          >
                            <X className="w-3 h-3" />
                            목록
                          </button>
                        </div>
                      </div>"""

content = content.replace(old_column3_header, new_column3_header)

# Now remove the Column 3 bottom action buttons
old_column3_actions = """                      {/* Validation warning */}
                      {blankForm.blanks.some((b) => !b.answer.trim()) && blankForm.blanks.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          모든 빈칸의 정답을 입력해주세요
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                        <Button variant="ghost" size="sm" onClick={cancelBlankEdit}>
                          {isAdmin ? '취소' : '닫기'}
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            onClick={saveBlankExercise}
                            disabled={blankSaving || !blankForm.templateText.trim() || blankForm.blanks.length === 0 || blankForm.blanks.some((b) => !b.answer.trim())}
                          >
                            {blankSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                            {isNewBlank ? '추가' : '수정'}
                          </Button>
                        )}
                      </div>"""

new_column3_actions = """                      {/* Validation warning */}
                      {blankForm.blanks.some((b) => !b.answer.trim()) && blankForm.blanks.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          모든 빈칸의 정답을 입력해주세요
                        </div>
                      )}"""

content = content.replace(old_column3_actions, new_column3_actions)

# ============================================================
# 14. Column 3: Add level color to blank position badges
# ============================================================
old_blank_badge = """                              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                {b.position}
                              </span>"""

new_blank_badge = """                              <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${blankForm.level === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {b.position}
                              </span>"""

content = content.replace(old_blank_badge, new_blank_badge)

# ============================================================
# 15. Modal Footer — unified: 닫기 / 저장
# ============================================================
old_footer = """            {/* Modal Footer */}
            <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={cancelEditing}>
                {isAdmin ? '취소' : '닫기'}
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={saveConcept}
                  disabled={saving || !editForm.title || !editForm.fullContent || (isNewConcept && !editForm.subjectId)}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving ? '저장 중...' : (isNewConcept ? '추가' : '저장')}
                </Button>
              )}
            </div>"""

new_footer = """            {/* Modal Footer — unified buttons */}
            <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-3 rounded-b-2xl flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={cancelEditing}>
                <X className="w-4 h-4 mr-1.5" />
                닫기
              </Button>
              <div className="flex items-center gap-2">
                {isAdmin && isDirty && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!confirm('변경사항을 되돌리시겠습니까?')) return;
                      // Revert concept form
                      if (savedEditForm) {
                        try { setEditForm(JSON.parse(savedEditForm)); } catch {}
                      }
                      // Revert blank form
                      if ((editingBlank || isNewBlank) && savedBlankForm) {
                        try { setBlankForm(JSON.parse(savedBlankForm)); } catch {}
                      }
                    }}
                  >
                    취소
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      // Save concept if dirty
                      if (conceptDirty) await saveConcept();
                      // Save blank if editing and dirty
                      if (blankDirty && (editingBlank || isNewBlank)) await saveBlankExercise();
                    }}
                    disabled={!isDirty || saving || blankSaving || !editForm.title || !editForm.fullContent || (isNewConcept && !editForm.subjectId) || ((editingBlank || isNewBlank) && blankDirty && (blankForm.blanks.length === 0 || blankForm.blanks.some((b) => !b.answer.trim())))}
                  >
                    {(saving || blankSaving) ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1.5" />
                    )}
                    {(saving || blankSaving) ? '저장 중...' : '저장'}
                  </Button>
                )}
              </div>
            </div>"""

content = content.replace(old_footer, new_footer)

# ============================================================
# Write the modified file
# ============================================================
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("All changes applied successfully!")
print(f"File length: {len(content)} chars, {content.count(chr(10))} lines")