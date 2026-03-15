#!/usr/bin/env python3
"""Rewrite concepts page: modal -> master-detail layout with 3-column blank editing."""

FILE = r'd:\mathlab\src\app\(teacher)\concepts\page.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    src = f.read()

# --- Modification 1: Add dirty check to startEditing ---
src = src.replace(
    '  const startEditing = (concept: ConceptItem) => {\n    setEditingConcept(concept);',
    "  const startEditing = (concept: ConceptItem) => {\n    if (editingConcept && isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 다른 개념으로 이동하시겠습니까?')) return;\n    setEditingConcept(concept);",
    1
)

# --- Modification 2: Add dirty check to startNewConcept ---
src = src.replace(
    '  const startNewConcept = () => {\n    setEditingConcept({',
    "  const startNewConcept = () => {\n    if (editingConcept && isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 새 개념을 추가하시겠습니까?')) return;\n    setEditingConcept({",
    1
)

# --- Modification 3: Remove unused imports (Card, BookOpen, Filter) ---
src = src.replace(
    "import { Card } from '@/components/ui/Card';\n",
    ""
)
src = src.replace(
    "  BookOpen,\n",
    ""
)
src = src.replace(
    "  Filter,\n",
    ""
)

# --- Modification 4: Replace entire return statement ---
RETURN_MARKER = '  return (\n    <div className="flex-1 flex p-6'
idx = src.index(RETURN_MARKER)
pre = src[:idx]

NEW_RETURN = r"""  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      {/* ===== Page Header ===== */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2.5">
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-base font-bold text-text-primary">개념 관리</h1>
          <span className="text-[11px] text-text-secondary bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {meta.total.toLocaleString()}개
          </span>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setBulkImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              일괄 가져오기
            </Button>
            <Button size="sm" onClick={startNewConcept}>
              <Plus className="w-4 h-4 mr-1.5" />
              새 개념
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ===== Left Panel: Search + Filters + Concept List ===== */}
        <aside className="w-72 shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col">
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                placeholder="개념 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            <select
              className="px-2 py-1 text-[11px] border border-slate-200 rounded bg-white focus:ring-1 focus:ring-primary/40"
              value={gradeFilter ?? ''}
              onChange={(e) => { setGradeFilter(e.target.value || null); setCurrentPage(1); }}
            >
              <option value="">전체 학년</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{GRADE_LABELS[g]}</option>
              ))}
            </select>
            <select
              className="px-2 py-1 text-[11px] border border-slate-200 rounded bg-white focus:ring-1 focus:ring-primary/40"
              value={categoryFilter ?? ''}
              onChange={(e) => { setCategoryFilter(e.target.value || null); setCurrentPage(1); }}
            >
              <option value="">카테고리</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <select
              className="px-2 py-1 text-[11px] border border-slate-200 rounded bg-white focus:ring-1 focus:ring-primary/40"
              value={partFilter ?? ''}
              onChange={(e) => { setPartFilter(e.target.value || null); setCurrentPage(1); }}
            >
              <option value="">영역</option>
              {PART_OPTIONS.map((pt) => (
                <option key={pt} value={pt}>{PART_LABELS[pt]}</option>
              ))}
            </select>
          </div>

          <div className="border-b border-slate-200" />

          {/* Concept List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : concepts.length === 0 ? (
              <div className="text-center py-10 text-text-secondary">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">개념이 없습니다</p>
              </div>
            ) : (
              concepts.map((concept) => (
                <div
                  key={concept.id}
                  className={`group flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 cursor-pointer transition-colors ${
                    editingConcept?.id === concept.id
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-white border-l-2 border-l-transparent'
                  }`}
                >
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => startEditing(concept)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-primary shrink-0">{concept.conceptCode}</span>
                      <span className="text-xs font-medium text-text-primary truncate">{concept.title}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-text-secondary">{GRADE_LABELS[concept.grade]}</span>
                      <span className="text-[10px] text-slate-300">&middot;</span>
                      <span className={`text-[10px] font-medium ${concept.category === 'concept' ? 'text-blue-600' : 'text-orange-600'}`}>
                        {CATEGORY_LABELS[concept.category] ?? concept.category}
                      </span>
                      <span className="text-[10px] text-slate-300">&middot;</span>
                      <span className="text-[10px] text-text-secondary">{PART_LABELS[concept.part] ?? concept.part}</span>
                    </div>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConcept(concept.id); }}
                      className="p-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 transition-all rounded hover:bg-red-50 shrink-0"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="shrink-0 px-3 py-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-text-secondary">
                {((currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(currentPage * ITEMS_PER_PAGE, meta.total)} / {meta.total}
              </span>
              <Pagination currentPage={currentPage} totalPages={meta.totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </aside>

        {/* ===== Right Panel: Editor ===== */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {!editingConcept ? (
            <div className="flex-1 flex items-center justify-center text-text-secondary">
              <div className="text-center">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-15" />
                <p className="font-medium text-text-primary">개념을 선택하세요</p>
                <p className="text-sm mt-1">왼쪽 목록에서 개념을 선택하거나 새 개념을 추가하세요</p>
              </div>
            </div>
          ) : (
            <>
              {/* --- Concept Info Bar --- */}
              <div className="shrink-0 px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-col gap-2">
                <div className="flex gap-3 items-end">
                  {isNewConcept && (
                    <div className="w-36 shrink-0">
                      <label className="block text-[10px] font-bold text-text-secondary mb-0.5">과목 *</label>
                      <select
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
                        value={editForm.subjectId}
                        onChange={(e) => setEditForm((p) => ({ ...p, subjectId: e.target.value }))}
                      >
                        {subjects.length === 0 && <option value="">과목을 불러오는 중...</option>}
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">제목 *</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.title}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">개념 코드</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.conceptCode}
                      onChange={(e) => setEditForm((p) => ({ ...p, conceptCode: e.target.value }))}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="w-28 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">학년</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
                      value={editForm.grade}
                      onChange={(e) => setEditForm((p) => ({ ...p, grade: e.target.value }))}
                      disabled={!isAdmin}
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{GRADE_LABELS[g]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">카테고리</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
                      value={editForm.category}
                      onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                      disabled={!isAdmin}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">영역</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
                      value={editForm.part}
                      onChange={(e) => setEditForm((p) => ({ ...p, part: e.target.value }))}
                      disabled={!isAdmin}
                    >
                      {PART_OPTIONS.map((pt) => (
                        <option key={pt} value={pt}>{PART_LABELS[pt]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">키워드</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.keywords}
                      onChange={(e) => setEditForm((p) => ({ ...p, keywords: e.target.value }))}
                      placeholder="쉼표로 구분"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </div>

              {/* --- Editor Body --- */}
              <div className="flex-1 overflow-hidden min-h-0">
                {(isNewBlank || editingBlank) && !isNewConcept ? (
                  /* ====== 3-Column: Template | Preview | Blanks ====== */
                  <div className="grid grid-cols-3 divide-x divide-slate-200 h-full">
                    {/* -- Col 1: Template -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto">
                      <label className="block text-xs font-bold text-text-secondary">
                        개념 내용 / 템플릿
                        {isAdmin && (
                          <span className="font-normal ml-1 text-slate-400">
                            {'{{1}}, {{2}} 형식으로 빈칸 위치 지정'}
                          </span>
                        )}
                      </label>
                      <div className="relative flex-1 min-h-[250px]">
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
                            blankForm.templateText.split(/(\{\{\d+\}\})/).map((part, i) =>
                              /^\{\{\d+\}\}$/.test(part) ? (
                                <mark key={i} className="bg-amber-200/80 text-amber-900 font-semibold rounded-sm px-0.5">{part}</mark>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )
                          ) : (
                            <span className="text-slate-400">{'개념 내용을 입력하고 {{1}}, {{2}} 형식으로 빈칸을 지정하세요.'}</span>
                          )}
                        </div>
                      </div>

                      {/* Prerequisites (Col 1 bottom) */}
                      <div>
                        <label className="block text-xs font-bold mb-1.5 text-text-secondary flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" />
                          선수 개념 ({editPrereqs.length}개)
                        </label>
                        {editPrereqs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {editPrereqs.map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium"
                              >
                                <span className="font-mono font-bold">{p.conceptCode}</span>
                                <span className="text-text-secondary">{p.title}</span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => removePrereq(p.id)}
                                    className="ml-0.5 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        {isAdmin && (
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
                              <Plus className="w-4 h-4" />
                            </div>
                            <input
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              value={prereqSearch}
                              onChange={(e) => searchPrereqs(e.target.value)}
                              placeholder="선수 개념 검색..."
                            />
                            {prereqSearching && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
                              </div>
                            )}
                            {prereqResults.length > 0 && (
                              <div className="absolute left-0 right-0 mt-1 border border-slate-200 rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto z-10">
                                {prereqResults.map((r) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => addPrereq(r)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                                  >
                                    <span className="font-mono text-primary font-bold text-xs shrink-0">{r.conceptCode}</span>
                                    <span className="truncate">{r.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* -- Col 2: Preview (always visible) -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto bg-slate-50/30">
                      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        미리보기
                      </h3>
                      {blankForm.blanks.length > 0 ? (
                        <>
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">원본 (정답 포함)</div>
                            <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                              {blankForm.templateText.split(/(\{\{\d+\}\})/).map((part, i) =>
                                /^\{\{\d+\}\}$/.test(part) ? (
                                  <span key={i} className="inline-flex items-center mx-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold">
                                    {(() => { const n = part.match(/\d+/)?.[0]; const blank = blankForm.blanks.find((b) => b.position === parseInt(n ?? '0', 10)); return blank?.answer || '?'; })()}
                                  </span>
                                ) : <InlineMathText key={i} text={part} />
                              )}
                            </p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">학생 화면</div>
                            <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                              {blankForm.templateText.split(/(\{\{\d+\}\})/).map((part, i) =>
                                /^\{\{\d+\}\}$/.test(part) ? (
                                  <span key={i} className="inline-block min-w-[2.5em] border-b-2 border-blue-400 mx-0.5 text-center text-[10px] text-blue-400">{part.match(/\d+/)?.[0]}</span>
                                ) : <InlineMathText key={i} text={part} />
                              )}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-text-secondary text-xs">
                          <div className="text-center">
                            <Eye className="w-6 h-6 mx-auto mb-2 opacity-20" />
                            <p>빈칸을 추가하면<br />미리보기가 표시됩니다</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* -- Col 3: Blanks -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                          빈칸 ({blankForm.blanks.length}개)
                        </h3>
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
                          >
                            <X className="w-3 h-3" />
                            목록
                          </button>
                        </div>
                      </div>

                      {/* Difficulty legend */}
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 쉬움</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 어려움</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> 전체</span>
                      </div>

                      {/* Blank items */}
                      {blankForm.blanks.length > 0 && (
                        <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                          {blankForm.blanks.map((b, idx) => (
                            <div
                              key={`${b.position}-${idx}`}
                              className={`flex items-center gap-1.5 bg-white rounded-lg p-2 border transition-colors ${
                                dragIdx === idx ? 'border-primary bg-primary/5' : 'border-slate-200'
                              }`}
                              draggable={isAdmin}
                              onDragStart={() => isAdmin && setDragIdx(idx)}
                              onDragOver={(e) => { e.preventDefault(); }}
                              onDrop={() => isAdmin && handleBlankDrop(idx)}
                              onDragEnd={() => setDragIdx(null)}
                            >
                              <GripVertical className="w-3 h-3 text-slate-300 shrink-0 cursor-grab" />
                              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}>
                                {b.position}
                              </span>
                              <input
                                className="flex-1 min-w-0 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                                value={b.answer}
                                onChange={(e) => updateBlankItem(b.position, 'answer', e.target.value)}
                                placeholder="정답"
                                disabled={!isAdmin}
                              />
                              <input
                                className="w-16 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                                value={b.hint}
                                onChange={(e) => updateBlankItem(b.position, 'hint', e.target.value)}
                                placeholder="힌트"
                                disabled={!isAdmin}
                              />
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = b.difficulty || 'both';
                                    const nextIdx = (DIFFICULTY_CYCLE.indexOf(cur) + 1) % DIFFICULTY_CYCLE.length;
                                    updateBlankItem(b.position, 'difficulty', DIFFICULTY_CYCLE[nextIdx]);
                                  }}
                                  className={`shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full transition-colors ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}
                                  title="클릭하여 난이도 변경"
                                >
                                  {DIFFICULTY_LABELS[b.difficulty || 'both']}
                                </button>
                              ) : (
                                <span className={`shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}>
                                  {DIFFICULTY_LABELS[b.difficulty || 'both']}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Validation warning */}
                      {blankForm.blanks.some((b) => !b.answer.trim()) && blankForm.blanks.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          모든 빈칸의 정답을 입력해주세요
                        </div>
                      )}

                      {/* Difficulty summary */}
                      {blankForm.blanks.length > 0 && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                          <span>쉬움: {blankForm.blanks.filter((b) => b.difficulty === 'easy' || b.difficulty === 'both' || !b.difficulty).length}개</span>
                          <span>어려움: {blankForm.blanks.filter((b) => b.difficulty === 'hard' || b.difficulty === 'both' || !b.difficulty).length}개</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ====== 2-Column: Content | Blank List ====== */
                  <div className="grid grid-cols-2 divide-x divide-slate-200 h-full">
                    {/* -- Col 1: Content -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto">
                      <label className="block text-xs font-bold text-text-secondary">개념 내용</label>
                      <textarea
                        className="w-full flex-1 min-h-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y disabled:bg-slate-50 disabled:text-text-secondary"
                        value={editForm.fullContent}
                        onChange={(e) => setEditForm((p) => ({ ...p, fullContent: e.target.value }))}
                        disabled={!isAdmin}
                      />

                      {/* Prerequisites */}
                      <div>
                        <label className="block text-xs font-bold mb-1.5 text-text-secondary flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" />
                          선수 개념 ({editPrereqs.length}개)
                        </label>
                        {editPrereqs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {editPrereqs.map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium"
                              >
                                <span className="font-mono font-bold">{p.conceptCode}</span>
                                <span className="text-text-secondary">{p.title}</span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => removePrereq(p.id)}
                                    className="ml-0.5 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        {isAdmin && (
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
                              <Plus className="w-4 h-4" />
                            </div>
                            <input
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              value={prereqSearch}
                              onChange={(e) => searchPrereqs(e.target.value)}
                              placeholder="선수 개념 검색..."
                            />
                            {prereqSearching && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
                              </div>
                            )}
                            {prereqResults.length > 0 && (
                              <div className="absolute left-0 right-0 mt-1 border border-slate-200 rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto z-10">
                                {prereqResults.map((r) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => addPrereq(r)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                                  >
                                    <span className="font-mono text-primary font-bold text-xs shrink-0">{r.conceptCode}</span>
                                    <span className="truncate">{r.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* -- Col 2: Blank exercise list -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto">
                      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        빈칸 문제 {blankExercises.length > 0 ? `(${blankExercises.length}개)` : ''}
                      </h3>

                      {isNewConcept ? (
                        <div className="text-center py-10 text-text-secondary">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">개념을 먼저 생성한 후<br />빈칸 문제를 추가할 수 있습니다</p>
                        </div>
                      ) : blanksLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : (
                        <>
                          {blankExercises.map((ex) => {
                            const answerPreview = ex.templateText.replace(/\{\{(\d+)\}\}/g, (_, n) => {
                              const blank = ex.blanks.find((b: BlankItem) => b.position === parseInt(n, 10));
                              return `[${blank?.answer ?? '?'}]`;
                            });
                            const isExpanded = expandedExIds.has(ex.id);
                            const easyCount = (ex.blanks as BlankItem[]).filter((b) => (b.difficulty || 'both') === 'easy' || (b.difficulty || 'both') === 'both').length;
                            const hardCount = (ex.blanks as BlankItem[]).filter((b) => (b.difficulty || 'both') === 'hard' || (b.difficulty || 'both') === 'both').length;

                            return (
                              <div key={ex.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="flex items-center gap-2.5 px-4 py-3">
                                  <button type="button" onClick={() => toggleExExpand(ex.id)} className="flex-1 min-w-0 text-left">
                                    <p className="text-xs text-text-primary truncate leading-relaxed">
                                      {answerPreview.length > 80 ? answerPreview.slice(0, 80) + '\u2026' : answerPreview}
                                    </p>
                                    <p className="text-[11px] text-text-secondary mt-0.5">
                                      빈칸 {ex.blanks.length}개 &middot; 쉬움 {easyCount} &middot; 어려움 {hardCount}
                                    </p>
                                  </button>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {isAdmin ? (
                                      <>
                                        <button type="button" onClick={() => startEditBlank(ex)} className="p-1.5 hover:bg-slate-100 rounded-lg text-text-secondary hover:text-primary transition-colors" title="수정">
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button type="button" onClick={() => deleteBlankExercise(ex.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-text-secondary hover:text-red-500 transition-colors" title="삭제">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <button type="button" onClick={() => startEditBlank(ex)} className="p-1.5 hover:bg-slate-100 rounded-lg text-text-secondary hover:text-primary transition-colors" title="보기">
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button type="button" onClick={() => toggleExExpand(ex.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-text-secondary transition-colors">
                                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="border-t border-slate-100">
                                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                                      <div className="px-3 py-2.5">
                                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">원본 (정답 포함)</div>
                                        <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap"><InlineMathText text={answerPreview} /></p>
                                      </div>
                                      <div className="px-3 py-2.5">
                                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">학생 화면</div>
                                        <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                                          {ex.templateText.split(/(\{\{\d+\}\})/).map((part, pi) =>
                                            /^\{\{\d+\}\}$/.test(part) ? (
                                              <span key={pi} className="inline-block min-w-[2.5em] border-b-2 border-blue-400 mx-0.5 text-center text-[10px] text-blue-400">{part.match(/\d+/)?.[0]}</span>
                                            ) : <InlineMathText key={pi} text={part} />
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="px-3 pb-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                                      {(ex.blanks as BlankItem[]).map((b) => (
                                        <span key={b.position} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}>
                                          <span className="font-bold">({b.position})</span>
                                          <span>{b.answer}</span>
                                          {b.hint && <span className="opacity-70">| {b.hint}</span>}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add/Edit blank button */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (blankExercises.length > 0) {
                                  startEditBlank(blankExercises[0]);
                                } else {
                                  startNewBlank();
                                }
                              }}
                              className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              {blankExercises.length > 0 ? '빈칸 편집' : '빈칸 추가'}
                            </button>
                          )}

                          {blankExercises.length === 0 && !isAdmin && (
                            <div className="text-center py-8 text-text-secondary">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">등록된 빈칸 문제가 없습니다</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* --- Footer --- */}
              <div className="shrink-0 bg-white border-t border-slate-200 px-5 py-2.5 flex items-center justify-between">
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
                        if (savedEditForm) {
                          try { setEditForm(JSON.parse(savedEditForm)); } catch {}
                        }
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
                        if (conceptDirty) await saveConcept();
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
              </div>
            </>
          )}
        </main>
      </div>

      {/* Bulk Import Modal */}
      {bulkImportOpen && (
        <BulkImportModal
          subjects={subjects}
          onClose={() => setBulkImportOpen(false)}
          onSuccess={() => { setBulkImportOpen(false); fetchConcepts(); }}
        />
      )}
    </div>
  );
}
"""

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(pre + NEW_RETURN)

print("Done! File rewritten successfully.")