'use client';

import { useWizardStore } from '@/stores/wizardStore';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DIFFICULTY_LABELS } from '@/types';
import type { QuestionDifficulty } from '@/types';
import { FileText, Printer, Columns2, Rows3, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

const MODE_LABELS = { test: '시험', level_test: '레벨테스트', worksheet: '학습지' } as const;
const SPACING_OPTIONS = [
  { value: 'compact', label: '좁게' },
  { value: 'normal', label: '보통' },
  { value: 'wide', label: '넓게' },
] as const;

export function Step3Settings() {
  const {
    mode,
    questions,
    title, setTitle,
    grade, setGrade,
    testType, setTestType,
    timeLimitMin, setTimeLimitMin,
    shuffleOptions, setShuffleOptions,
    spacing, setSpacing,
    columns, setColumns,
    showAnswerKey, setShowAnswerKey,
    tags, setTags,
  } = useWizardStore();

  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  return (
    <div className="flex h-full">
      {/* 왼쪽: 설정 패널 */}
      <div className="w-[420px] shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* 제목 */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              {MODE_LABELS[mode]} 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${MODE_LABELS[mode]} 제목을 입력하세요`}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* 학년 */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              학년
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              {[3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>초등 {g}학년</option>
              ))}
              {[7, 8, 9].map((g) => (
                <option key={g} value={g}>중등 {g - 6}학년</option>
              ))}
            </select>
          </div>

          {/* 시험 유형 (test 모드만) */}
          {mode === 'test' && (
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                시험 유형
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'concept', label: '개념' },
                  { value: 'midterm', label: '중간고사' },
                  { value: 'final', label: '기말고사' },
                  { value: 'mock', label: '모의고사' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTestType(opt.value)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                      testType === opt.value
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 제한 시간 */}
          {mode !== 'worksheet' && (
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                제한 시간 (분)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={timeLimitMin ?? ''}
                  onChange={(e) => setTimeLimitMin(e.target.value ? Number(e.target.value) : null)}
                  placeholder="없음"
                  className="w-24 px-3 py-2 border border-slate-200 rounded-sm text-sm"
                />
                <span className="text-xs text-slate-400">비워두면 시간 제한 없음</span>
              </div>
            </div>
          )}

          {/* 보기 섞기 (test 모드만) */}
          {mode === 'test' && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">보기 순서 랜덤</span>
              <label className="relative inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
              </label>
            </div>
          )}

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">
              <Printer className="w-3.5 h-3.5 inline mr-1" />
              인쇄 설정
            </h3>

            {/* 문제 간격 */}
            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">문제 간격</label>
              <div className="flex gap-2">
                {SPACING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSpacing(opt.value)}
                    className={`flex-1 px-3 py-2 rounded-sm text-xs font-medium transition-colors ${
                      spacing === opt.value
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Rows3 className="w-3.5 h-3.5 mx-auto mb-1" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 단 수 */}
            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">단 수</label>
              <div className="flex gap-2">
                {([1, 2] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => setColumns(col)}
                    className={`flex-1 px-3 py-2 rounded-sm text-xs font-medium transition-colors ${
                      columns === col
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Columns2 className="w-3.5 h-3.5 mx-auto mb-1" />
                    {col}단
                  </button>
                ))}
              </div>
            </div>

            {/* 정답지 포함 */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">정답지 포함</span>
              <label className="relative inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnswerKey}
                  onChange={(e) => setShowAnswerKey(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
              </label>
            </div>
          </div>

          {/* 태그 */}
          <div className="border-t border-slate-100 pt-6">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              <Tag className="w-3.5 h-3.5 inline mr-1" />
              태그
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="태그 입력 후 Enter"
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-sm text-sm"
              />
              <Button variant="secondary" size="sm" onClick={handleAddTag}>추가</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    {t}
                    <button onClick={() => handleRemoveTag(t)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 오른쪽: 인쇄 미리보기 */}
      <div className="flex-1 bg-slate-100 overflow-y-auto p-6">
        <PrintPreview
          title={title || `${MODE_LABELS[mode]} (미리보기)`}
          grade={grade}
          questions={questions}
          spacing={spacing}
          columns={columns}
          showAnswerKey={showAnswerKey}
        />
      </div>
    </div>
  );
}

// --- 인쇄 미리보기 ---
interface PrintPreviewProps {
  title: string;
  grade: number;
  questions: { id: string; content: string; choices: string[] | null; answer: string; difficulty: string; chapter: string }[];
  spacing: 'compact' | 'normal' | 'wide';
  columns: 1 | 2;
  showAnswerKey: boolean;
}

function PrintPreview({ title, grade, questions, spacing, columns, showAnswerKey }: PrintPreviewProps) {
  const spacingClass = spacing === 'compact' ? 'space-y-2' : spacing === 'wide' ? 'space-y-8' : 'space-y-5';
  const gradeLabel = grade <= 6 ? `초등 ${grade}학년` : `중등 ${grade - 6}학년`;

  return (
    <div className="max-w-[210mm] mx-auto bg-white shadow-lg rounded-sm overflow-hidden">
      {/* 헤더 */}
      <div className="text-center p-6 pb-4 border-b border-slate-200">
        <h1 className="text-xl font-black text-text-primary">{title}</h1>
        <div className="flex justify-center items-center gap-4 mt-2 text-xs text-text-secondary">
          <span>{gradeLabel}</span>
          <span>|</span>
          <span>{questions.length}문제</span>
          <span>|</span>
          <span>{new Date().toLocaleDateString('ko-KR')}</span>
        </div>
        <div className="mt-3 border-t border-b border-slate-300 py-2 flex gap-8">
          <div className="text-xs">
            <span className="text-text-secondary">이름: </span>
            <span className="inline-block w-28 border-b border-slate-300" />
          </div>
          <div className="text-xs">
            <span className="text-text-secondary">점수: </span>
            <span className="inline-block w-16 border-b border-slate-300" />
          </div>
        </div>
      </div>

      {/* 문제 영역 */}
      <div className={`p-6 ${columns === 2 ? 'columns-2 gap-6' : ''}`}>
        <div className={spacingClass}>
          {questions.map((q, idx) => (
            <div key={q.id} className="break-inside-avoid">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-text-primary shrink-0 w-7">
                  {idx + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] text-slate-400 truncate">[{q.chapter}]</span>
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                      q.difficulty === 'BASIC' ? 'bg-emerald-100 text-emerald-700' :
                      q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {DIFFICULTY_LABELS[q.difficulty as QuestionDifficulty] ?? q.difficulty}
                    </span>
                  </div>
                  <div className="text-xs text-text-primary">
                    <MathRenderer content={q.content.length > 200 ? q.content.slice(0, 200) + '…' : q.content} />
                  </div>
                  {q.choices && q.choices.length > 0 && (
                    <div className="mt-1 grid grid-cols-2 gap-0.5 text-xs">
                      {q.choices.map((c, ci) => (
                        <div key={ci} className="flex items-start gap-1">
                          <span className="text-slate-400 shrink-0">{ci + 1})</span>
                          <MathRenderer content={c} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 정답표 */}
      {showAnswerKey && questions.length > 0 && (
        <div className="mx-6 mb-6 pt-3 border-t border-slate-300">
          <h3 className="text-xs font-bold text-text-primary mb-1.5">정답표</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {questions.map((q, idx) => (
              <span key={q.id} className="text-text-secondary">
                {idx + 1}. <span className="font-bold text-text-primary [&_p]:inline [&_p]:m-0"><MathRenderer content={q.answer} /></span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
