#!/usr/bin/env python3
"""
Refactor the concept edit modal:
1. Move concept info to compact top bar
2. Always 2 columns (no 3-column)
3. Add per-blank difficulty field
4. Fix "add blank" button logic
"""

FILE = r'd:\mathlab\src\app\(teacher)\concepts\page.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. Update BlankItem interface to include difficulty
# ============================================================
content = content.replace(
    """interface BlankItem {
  position: number;
  answer: string;
  hint: string;
}""",
    """type BlankDifficulty = 'easy' | 'hard' | 'both';

interface BlankItem {
  position: number;
  answer: string;
  hint: string;
  difficulty: BlankDifficulty;
}

const DIFFICULTY_CYCLE: BlankDifficulty[] = ['both', 'easy', 'hard'];
const DIFFICULTY_LABELS: Record<BlankDifficulty, string> = { easy: '쉬움', hard: '어려움', both: '전체' };
const DIFFICULTY_COLORS: Record<BlankDifficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-700',
  hard: 'bg-amber-100 text-amber-700',
  both: 'bg-blue-100 text-blue-700',
};"""
)

# ============================================================
# 2. Update syncBlanksFromTemplate — add default difficulty
# ============================================================
content = content.replace(
    "const synced = positions.map((pos) => existingMap.get(pos) ?? { position: pos, answer: '', hint: '' });",
    "const synced = positions.map((pos) => existingMap.get(pos) ?? { position: pos, answer: '', hint: '', difficulty: 'both' as BlankDifficulty });"
)

# ============================================================
# 3. Update startNewBlank — add default difficulty to blanks
# ============================================================
content = content.replace(
    "const blanks = positions.map((pos) => ({ position: pos, answer: '', hint: '' }));",
    "const blanks = positions.map((pos) => ({ position: pos, answer: '', hint: '', difficulty: 'both' as BlankDifficulty }));"
)

# ============================================================
# 4. Update startEditBlank — ensure difficulty field exists
# ============================================================
content = content.replace(
    "const orderedBlanks = orderedPositions.map((pos) => blankMap.get(pos) ?? { position: pos, answer: '', hint: '' });",
    "const orderedBlanks = orderedPositions.map((pos) => { const b = blankMap.get(pos); return b ? { ...b, difficulty: (b as BlankItem).difficulty || 'both' } : { position: pos, answer: '', hint: '', difficulty: 'both' as BlankDifficulty }; });"
)

# ============================================================
# 5. Update updateBlankItem — include difficulty in field type
# ============================================================
content = content.replace(
    "const updateBlankItem = (position: number, field: 'answer' | 'hint', value: string) => {",
    "const updateBlankItem = (position: number, field: 'answer' | 'hint' | 'difficulty', value: string) => {"
)

# ============================================================
# 6. Replace entire modal (lines 962 to 1520)
# ============================================================
# Find the start and end markers
modal_start = "      {/* Edit Modal — Wide 2-column layout */}"
modal_end_marker = "      {/* Bulk Import Modal */}"

start_idx = content.index(modal_start)
end_idx = content.index(modal_end_marker)

before_modal = content[:start_idx]
after_modal = content[end_idx:]

new_modal = r"""      {/* Edit Modal */}
      {editingConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{isNewConcept ? '새 개념 추가' : (isAdmin ? '개념 수정' : '개념 상세')}</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {editingConcept.conceptCode && <>{editingConcept.conceptCode} &middot; </>}
                  {GRADE_LABELS[editingConcept.grade] ?? editingConcept.grade}
                </p>
              </div>
              <button onClick={cancelEditing} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Concept Info — compact top bar */}
            <div className="shrink-0 px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col gap-2">
              {/* Row 1: Subject (new only) + Title + Code */}
              <div className="flex gap-3 items-end">
                {isNewConcept && (
                  <div className="w-40 shrink-0">
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
                <div className="w-28 shrink-0">
                  <label className="block text-[10px] font-bold text-text-secondary mb-0.5">개념 코드</label>
                  <input
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                    value={editForm.conceptCode}
                    onChange={(e) => setEditForm((p) => ({ ...p, conceptCode: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
              {/* Row 2: Grade/Category/Part + Keywords */}
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

            {/* Modal Body — always 2 columns */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-0">
                {/* ===== Left Column: Content / Template ===== */}
                <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
                  {(isNewBlank || editingBlank) && !isNewConcept ? (
                    <>
                      {/* Template text with highlight overlay */}
                      <div className="flex-1 flex flex-col min-h-0">
                        <label className="block text-xs font-bold mb-1 text-text-secondary">
                          개념 내용 / 템플릿
                          {isAdmin && (
                            <span className="font-normal ml-1 text-slate-400">
                              {'{{1}}, {{2}} 형식으로 빈칸 위치 지정'}
                            </span>
                          )}
                        </label>
                        <div className="relative flex-1 min-h-[300px]">
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
                      </div>

                      {/* Preview — collapsible */}
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
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Concept content textarea (non-editing mode) */}
                      <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-bold mb-1 text-text-secondary">개념 내용</label>
                        <textarea
                          className="w-full flex-1 min-h-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y disabled:bg-slate-50 disabled:text-text-secondary"
                          value={editForm.fullContent}
                          onChange={(e) => setEditForm((p) => ({ ...p, fullContent: e.target.value }))}
                          disabled={!isAdmin}
                        />
                      </div>
                    </>
                  )}

                  {/* Prerequisites — always at bottom of left column */}
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

                {/* ===== Right Column: Blanks ===== */}
                <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
                  {(isNewBlank || editingBlank) && !isNewConcept ? (
                    <>
                      {/* Blank editing — items with difficulty */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
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

                      {/* Blank items with difficulty toggle */}
                      {blankForm.blanks.length > 0 && (
                        <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                          {blankForm.blanks.map((b, idx) => (
                            <div
                              key={`${b.position}-${idx}`}
                              className={`flex items-center gap-2 bg-white rounded-lg p-2 border transition-colors ${
                                dragIdx === idx ? 'border-primary bg-primary/5' : 'border-slate-200'
                              }`}
                              draggable={isAdmin}
                              onDragStart={() => isAdmin && setDragIdx(idx)}
                              onDragOver={(e) => { e.preventDefault(); }}
                              onDrop={() => isAdmin && handleBlankDrop(idx)}
                              onDragEnd={() => setDragIdx(null)}
                            >
                              <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0 cursor-grab" />
                              <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}>
                                {b.position}
                              </span>
                              <input
                                className="flex-1 min-w-0 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                                value={b.answer}
                                onChange={(e) => updateBlankItem(b.position, 'answer', e.target.value)}
                                placeholder="정답"
                                disabled={!isAdmin}
                              />
                              <input
                                className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                                value={b.hint}
                                onChange={(e) => updateBlankItem(b.position, 'hint', e.target.value)}
                                placeholder="힌트"
                                disabled={!isAdmin}
                              />
                              {/* Difficulty toggle */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = b.difficulty || 'both';
                                    const nextIdx = (DIFFICULTY_CYCLE.indexOf(cur) + 1) % DIFFICULTY_CYCLE.length;
                                    updateBlankItem(b.position, 'difficulty', DIFFICULTY_CYCLE[nextIdx]);
                                  }}
                                  className={`shrink-0 px-2 py-1 text-[10px] font-bold rounded-full transition-colors ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}
                                  title="클릭하여 난이도 변경"
                                >
                                  {DIFFICULTY_LABELS[b.difficulty || 'both']}
                                </button>
                              )}
                              {!isAdmin && (
                                <span className={`shrink-0 px-2 py-1 text-[10px] font-bold rounded-full ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}>
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
                    </>
                  ) : (
                    <>
                      {/* Blank exercise list (non-editing mode) */}
                      <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
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
                          {/* Existing exercises — compact cards with expand */}
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
                                      {answerPreview.length > 80 ? answerPreview.slice(0, 80) + '…' : answerPreview}
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

                          {/* Empty state */}
                          {blankExercises.length === 0 && !isAdmin && (
                            <div className="text-center py-8 text-text-secondary">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">등록된 빈칸 문제가 없습니다</p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer — unified buttons */}
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
          </div>
        </div>
      )}

"""

content = before_modal + new_modal + after_modal

# ============================================================
# 7. Remove unused Brain icon import (no longer used in modal)
# ============================================================
# Brain is still used? Let's check — it was used in "개념 정보" header which is now removed.
# Let's keep it since removing icons from import might break if used elsewhere.
# Actually, let's check:
if 'Brain' not in content.replace("import", "").replace("Brain,", ""):
    # Brain only appears in import, safe to remove
    pass
# Actually, let's just leave it. The linter will catch unused imports.

# ============================================================
# Write
# ============================================================
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Refactoring complete! File: {len(content)} chars, {content.count(chr(10))} lines")
