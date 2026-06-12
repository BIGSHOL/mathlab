'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { useExtractToBank } from '@/hooks/useExtractToBank';
import { gradeToBookCode, parseGradeInfo } from '@/lib/exam-analysis/exam-to-question-mapper';
import { X, Check, AlertTriangle, Loader2, Database, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { MathRenderer } from '@/components/math/MathRenderer';
import Link from 'next/link';

interface ExtractToBankModalProps {
  examPaperId: string;
  grade: string;       // "중3" 등
  category?: string;   // "중3-1" 등 (학기 자동 추출용)
  examTitle: string;
  onClose: () => void;
}

const DIFFICULTY_BADGE: Record<string, { label: string; cls: string }> = {
  BASIC: { label: '기본', cls: 'bg-green-100 text-green-700' },
  MEDIUM: { label: '보통', cls: 'bg-blue-100 text-blue-700' },
  HIGH: { label: '어려움', cls: 'bg-orange-100 text-orange-700' },
  HIGHEST: { label: '최고', cls: 'bg-red-100 text-red-700' },
};

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: '객관식',
  SHORT_ANSWER: '단답형',
  ESSAY: '서술형',
};

export function ExtractToBankModal({ examPaperId, grade, category, examTitle, onClose }: ExtractToBankModalProps) {
  const {
    step, questions, stats, selected, elapsed, savedCount,
    startExtraction, toggleQuestion, toggleAll, updateAnswer, saveToBank, reset,
  } = useExtractToBank(examPaperId);

  // category에서 학기 자동 추출 (예: "중3-1" → "1")
  const autoSemester = useMemo(() => {
    if (category) {
      const m = category.match(/(\d)$/);
      if (m) return m[1];
    }
    return '1';
  }, [category]);

  const { levelLabel, gradeNum } = useMemo(() => parseGradeInfo(grade), [grade]);
  const [semester, setSemester] = useState(autoSemester);
  const bookCode = useMemo(() => gradeToBookCode(grade, semester), [grade, semester]);

  // category가 확정되어 있으면 bookCode도 확정 → 교재 코드를 수정 가능하게는 유지
  const hasAutoConfig = !!category;

  const selectedWithAnswer = useMemo(
    () => questions.filter((q, i) => selected.has(i) && q.content && q.answer).length,
    [questions, selected],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">문제은행에 추가</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'config' && (
            <ConfigStep
              levelLabel={levelLabel}
              gradeNum={gradeNum}
              semester={semester}
              setSemester={setSemester}
              bookCode={bookCode}
              examTitle={examTitle}
              hasAutoConfig={hasAutoConfig}
              onStart={() => startExtraction(bookCode)}
            />
          )}

          {step === 'extracting' && <ExtractingStep elapsed={elapsed} />}

          {step === 'preview' && (
            <PreviewStep
              questions={questions}
              stats={stats}
              selected={selected}
              toggleQuestion={toggleQuestion}
              toggleAll={toggleAll}
              updateAnswer={updateAnswer}
            />
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-slate-600">문제은행에 저장 중...</p>
            </div>
          )}

          {step === 'done' && <DoneStep savedCount={savedCount} />}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50">
          {step === 'preview' && (
            <>
              <span className="text-xs text-slate-500">
                {selectedWithAnswer}개 문제 저장 가능
                {selected.size > selectedWithAnswer && (
                  <span className="text-amber-600 ml-1">
                    (정답 없는 {selected.size - selectedWithAnswer}개 제외)
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={reset}>처음으로</Button>
                <Button size="sm" onClick={saveToBank} disabled={selectedWithAnswer === 0}>
                  문제은행에 저장 ({selectedWithAnswer})
                </Button>
              </div>
            </>
          )}
          {step === 'done' && (
            <>
              <span />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={onClose}>닫기</Button>
                <Link href="/questions">
                  <Button size="sm">
                    문제은행 보기 <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </>
          )}
          {(step === 'config' || step === 'extracting' || step === 'saving') && (
            <>
              <span />
              <Button size="sm" variant="secondary" onClick={onClose} disabled={step === 'extracting'}>
                닫기
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: 설정 ──

function ConfigStep({
  levelLabel, gradeNum, semester, setSemester, bookCode, examTitle, hasAutoConfig, onStart,
}: {
  levelLabel: string;
  gradeNum: string;
  semester: string;
  setSemester: (s: string) => void;
  bookCode: string;
  examTitle: string;
  hasAutoConfig: boolean;
  onStart: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-sm p-3">
        <p className="text-xs text-blue-700">
          <strong>{examTitle}</strong>의 시험 이미지를 AI가 분석하여 문제 본문, 정답, 선택지를 추출합니다.
          기출분석에서 이미 파악된 난이도·유형·단원 정보가 자동 적용됩니다.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">교재 코드</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-sm font-medium">
            {levelLabel}{gradeNum}
          </span>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="text-sm border rounded-sm px-2 py-1.5"
          >
            <option value="1">1학기</option>
            <option value="2">2학기</option>
          </select>
          <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-sm font-mono">{bookCode}</span>
          {hasAutoConfig && (
            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-sm">자동 설정됨</span>
          )}
        </div>
      </div>

      <Button onClick={onStart} className="w-full">
        <Database className="w-4 h-4 mr-1.5" />
        문제 추출 시작
      </Button>
    </div>
  );
}

// ── Step 2: 추출 중 ──

function ExtractingStep({ elapsed }: { elapsed: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
        <Database className="w-6 h-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-800">AI가 시험지에서 문제를 추출하고 있습니다</p>
        <p className="text-xs text-slate-500 mt-1">약 30~90초 소요됩니다</p>
      </div>
      <div className="w-64">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-500">추출 중...</span>
          <span className="text-[11px] text-slate-500 tabular-nums">{elapsed}초</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-indigo to-brand-cyan rounded-full transition-all duration-1000"
            style={{ width: `${Math.min((elapsed / 90) * 100, 95)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 3: 미리보기 ──

function PreviewStep({
  questions, stats, selected, toggleQuestion, toggleAll, updateAnswer,
}: {
  questions: Array<{ questionNum: number; difficulty: string; type: string; chapter: string; section?: string; content: string; choices?: string[]; answer: string; matched: boolean }>;
  stats: { total: number; matched: number; unmatchedExtracted: number[]; unmatchedAnalyzed: (number | string)[] } | null;
  selected: Set<number>;
  toggleQuestion: (i: number) => void;
  toggleAll: () => void;
  updateAnswer: (i: number, answer: string) => void;
}) {
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const toggleExpand = (i: number) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* 통계 + 전체 선택 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          {stats && (
            <>
              <span className="text-slate-600">총 <strong>{stats.total}</strong>문항</span>
              <span className="text-green-600">
                <Check className="w-3 h-3 inline mr-0.5" />매칭 {stats.matched}
              </span>
              {stats.unmatchedExtracted.length > 0 && (
                <span className="text-amber-600">
                  <AlertTriangle className="w-3 h-3 inline mr-0.5" />미매칭 {stats.unmatchedExtracted.length}
                </span>
              )}
            </>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.size === questions.length && questions.length > 0}
            onChange={toggleAll}
            className="rounded-sm"
          />
          전체 선택
        </label>
      </div>

      {/* 카드 목록 */}
      <div className="space-y-3">
        {questions.map((q, i) => {
          const diff = DIFFICULTY_BADGE[q.difficulty];
          const noAnswer = !q.answer;
          const isExpanded = expandedSet.has(i);
          const hasChoices = q.choices && q.choices.length > 0;
          const maxChoiceLen = hasChoices ? Math.max(...q.choices!.map((c) => c.length)) : 0;

          return (
            <div key={i} className={`border rounded-sm overflow-hidden ${selected.has(i) ? 'border-primary/30 bg-white' : 'border-slate-200 bg-slate-50/50 opacity-60'}`}>
              {/* 헤더 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleQuestion(i)}
                  className="rounded-sm"
                />
                <span className="text-sm font-bold text-primary">#{q.questionNum}</span>
                {diff && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${diff.cls}`}>
                    {diff.label}
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                  {TYPE_LABEL[q.type] || q.type}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {q.chapter}{q.section ? ` > ${q.section}` : ''}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  {q.matched ? (
                    <span className="text-[9px] text-green-600 bg-green-50 px-1 py-0.5 rounded-sm">매칭</span>
                  ) : (
                    <span className="text-[9px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded-sm">미매칭</span>
                  )}
                  <button onClick={() => toggleExpand(i)} className="p-0.5 text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 본문 (항상 표시) */}
              <div className="px-4 py-3">
                <div className="prose prose-sm max-w-none text-sm">
                  <MathRenderer content={q.content} />
                </div>

                {/* 객관식 보기 */}
                {hasChoices && (
                  <div className={`mt-3 grid ${maxChoiceLen > 30 ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5 text-sm`}>
                    {q.choices!.map((choice, ci) => (
                      <div key={ci} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                        <MathRenderer content={choice} />
                      </div>
                    ))}
                  </div>
                )}

                {/* 정답 & 상세 (펼침 시) */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-green-600 mt-0.5 shrink-0">정답</span>
                      {noAnswer ? (
                        <input
                          type="text"
                          placeholder="정답을 입력하세요"
                          className="flex-1 text-xs border border-amber-300 rounded-sm px-2 py-1 bg-white"
                          onChange={(e) => updateAnswer(i, e.target.value)}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-sm">
                            <MathRenderer content={q.answer} />
                          </div>
                          <span className="text-[9px] text-amber-500 bg-amber-50 px-1 py-0.5 rounded-sm shrink-0">AI 추정</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 4: 완료 ──

function DoneStep({ savedCount }: { savedCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="w-6 h-6 text-green-600" />
      </div>
      <p className="text-sm font-medium text-slate-800">{savedCount}개 문제가 저장되었습니다</p>
      <p className="text-xs text-slate-500">문제은행에서 확인할 수 있습니다</p>
    </div>
  );
}
