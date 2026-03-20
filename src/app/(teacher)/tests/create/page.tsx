'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import {
  Search,
  X,
  ClipboardCheck,
  Check,
  Copy,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { MathRenderer } from '@/components/math/MathRenderer';
import { useTests } from '@/hooks/useTests';
import { DIFFICULTY_LABELS, TYPE_LABELS, BOOK_LABELS } from '@/types';
import type { QuestionDifficulty, QuestionType } from '@/types';

const BOOK_CODES = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'] as const;
const DIFFICULTY_OPTIONS = ['전체', 'BASIC', 'MEDIUM', 'HIGH', 'HIGHEST'] as const;

interface QuestionItem {
  id: string;
  bookCode: string;
  chapter: string;
  questionNum: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices: string[] | null;
  domain: string | null;
  conceptId: string | null;
}

export default function CreateTestPage() {
  const router = useRouter();
  const { createTest } = useTests();

  // Form state
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState(7);
  const [testType, setTestType] = useState('concept');
  const [timeLimitMin, setTimeLimitMin] = useState<number | ''>('');
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<number | ''>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [variantCount, setVariantCount] = useState(2);
  const [generatingVariants, setGeneratingVariants] = useState(false);

  // Question browser state
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [bookCode, setBookCode] = useState('1-1');
  const [difficulty, setDifficulty] = useState('전체');
  const [searchText, setSearchText] = useState('');

  const fetchQuestions = useCallback(async () => {
    setSearchLoading(true);
    const params = new URLSearchParams({ bookCode, limit: '50' });
    if (difficulty !== '전체') params.set('difficulty', difficulty);
    if (searchText) params.set('search', searchText);

    try {
      const res = await fetch(`/api/questions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setQuestions(json.data ?? []);
      }
    } catch {
      // ignore
    }
    setSearchLoading(false);
  }, [bookCode, difficulty, searchText]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.warning('시험 제목을 입력하세요'); return; }
    if (selectedIds.length === 0) { toast.warning('문제를 1개 이상 선택하세요'); return; }

    setSaving(true);
    try {
      await createTest({
        title: title.trim(),
        grade,
        testType,
        questionIds: selectedIds,
        timeLimitMin: timeLimitMin || undefined,
        shuffleOptions,
        maxAttempts: maxAttempts || null,
      });
      router.push('/tests');
    } catch {
      toast.error('시험 생성 실패');
    }
    setSaving(false);
  };

  const handleGenerateVariants = async () => {
    if (!title.trim()) { toast.warning('시험 제목을 입력하세요'); return; }
    if (selectedIds.length === 0) { toast.warning('문제를 1개 이상 선택하세요'); return; }

    setGeneratingVariants(true);
    try {
      const res = await fetch('/api/tests/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceQuestionIds: selectedIds,
          variantCount,
          title: title.trim(),
          grade,
          testType,
          timeLimitMin: timeLimitMin || undefined,
          shuffleOptions,
          maxAttempts: maxAttempts || null,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`변형 시험지 ${json.data.length}개가 생성되었습니다!`);
        router.push('/tests');
      } else {
        const json = await res.json();
        toast.error(json.error?.message || '변형 시험지 생성 실패');
      }
    } catch {
      toast.error('변형 시험지 생성 실패');
    }
    setGeneratingVariants(false);
  };

  return (
    <div className="p-3 max-w-6xl mx-auto">
      {/* Header */}
      <PageHeader title="시험 만들기" backHref="/tests" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Test settings */}
        <div className="lg:col-span-1 space-y-2">
          <Card className="p-3">
            <h2 className="text-base font-bold text-text-primary mb-2">시험 정보</h2>

            <label className="block mb-3">
              <span className="text-sm font-medium text-text-secondary">시험 제목 *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 중1 방정식 단원평가"
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-text-secondary">학년</span>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
              >
                <option value={7}>중1</option>
                <option value={8}>중2</option>
                <option value={9}>중3</option>
              </select>
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-text-secondary">시험 유형</span>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
              >
                <option value="concept">단원별</option>
                <option value="cumulative">종합</option>
                <option value="chapter_final">단원 마무리</option>
              </select>
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-text-secondary">제한 시간 (분, 선택)</span>
              <input
                type="number"
                value={timeLimitMin}
                onChange={(e) => setTimeLimitMin(e.target.value ? Number(e.target.value) : '')}
                placeholder="제한 없음"
                min={1}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-text-secondary">응시 횟수 제한 (선택)</span>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value ? Number(e.target.value) : '')}
                placeholder="무제한"
                min={1}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-xs text-slate-400 mt-0.5 block">비워두면 무제한 재시험 가능</span>
            </label>

            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="w-4 h-4 rounded-sm border-slate-300 text-primary focus:ring-primary/40"
              />
              <span className="text-sm text-text-secondary">문제 순서 섞기</span>
            </label>
          </Card>

          {/* Selected questions */}
          <Card className="p-3">
            <h2 className="text-base font-bold text-text-primary mb-3">
              선택된 문제 ({selectedIds.length})
            </h2>
            {selectedIds.length === 0 ? (
              <p className="text-sm text-slate-400">오른쪽에서 문제를 선택하세요</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedIds.map((id, idx) => (
                  <div key={id} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-sm text-sm">
                    <span className="text-text-secondary">{idx + 1}. {id.slice(-6)}</span>
                    <button onClick={() => toggleQuestion(id)} className="text-red-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              className="w-full mt-2"
              onClick={handleSubmit}
              loading={saving}
              disabled={!title.trim() || selectedIds.length === 0}
            >
              <ClipboardCheck className="w-4 h-4 mr-1" />
              시험 저장 ({selectedIds.length}문제)
            </Button>

            {/* Variant generation */}
            {selectedIds.length >= 3 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Copy className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs font-semibold text-text-secondary">변형 시험지 생성</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={variantCount}
                    onChange={(e) => setVariantCount(Number(e.target.value))}
                    className="px-2 py-1 border border-slate-200 rounded-sm text-xs"
                  >
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}개</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={handleGenerateVariants}
                    loading={generatingVariants}
                    disabled={!title.trim() || selectedIds.length === 0}
                  >
                    변형 생성
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  같은 유형/난이도의 다른 문제로 구성된 시험지를 자동 생성합니다
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Question browser */}
        <div className="lg:col-span-2">
          <Card className="p-3">
            <h2 className="text-base font-bold text-text-primary mb-2">문제 선택</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-2">
              <select
                value={bookCode}
                onChange={(e) => setBookCode(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-sm text-sm"
              >
                {BOOK_CODES.map((c) => (
                  <option key={c} value={c}>{BOOK_LABELS[c]}</option>
                ))}
              </select>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-sm text-sm"
              >
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d === '전체' ? '전체 난이도' : DIFFICULTY_LABELS[d as QuestionDifficulty]}
                  </option>
                ))}
              </select>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="문제 검색..."
                  className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>

            {/* Question list */}
            {searchLoading ? (
              <div className="space-y-1.5 p-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded" />
                ))}
              </div>
            ) : questions.length === 0 ? (
              <p className="text-center text-text-secondary py-8">검색 결과가 없습니다</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {questions.map((q) => {
                  const isSelected = selectedIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      className={`p-2.5 rounded-sm border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-5 h-5 mt-0.5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-500">
                              {q.chapter} #{q.questionNum}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-sm text-xs font-bold ${
                              q.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                              q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {DIFFICULTY_LABELS[q.difficulty]}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-sm text-xs font-medium bg-slate-100 text-slate-600">
                              {TYPE_LABELS[q.type]}
                            </span>
                          </div>
                          <div className="text-sm text-text-primary line-clamp-2">
                            <MathRenderer content={q.content.slice(0, 150)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
