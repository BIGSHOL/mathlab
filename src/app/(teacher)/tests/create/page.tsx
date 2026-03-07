'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  X,
  ClipboardCheck,
  Loader2,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
    if (!title.trim()) return alert('시험 제목을 입력하세요');
    if (selectedIds.length === 0) return alert('문제를 1개 이상 선택하세요');

    setSaving(true);
    try {
      await createTest({
        title: title.trim(),
        grade,
        testType,
        questionIds: selectedIds,
        timeLimitMin: timeLimitMin || undefined,
        shuffleOptions,
      });
      router.push('/tests');
    } catch {
      alert('시험 생성 실패');
    }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tests" className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">시험 만들기</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Test settings */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-5">
            <h2 className="text-base font-bold text-text-primary mb-4">시험 정보</h2>

            <label className="block mb-3">
              <span className="text-sm font-medium text-text-secondary">시험 제목 *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 중1 방정식 단원평가"
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-text-secondary">학년</span>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40"
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
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40"
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
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/40"
              />
              <span className="text-sm text-text-secondary">문제 순서 섞기</span>
            </label>
          </Card>

          {/* Selected questions */}
          <Card className="p-5">
            <h2 className="text-base font-bold text-text-primary mb-3">
              선택된 문제 ({selectedIds.length})
            </h2>
            {selectedIds.length === 0 ? (
              <p className="text-sm text-slate-400">오른쪽에서 문제를 선택하세요</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedIds.map((id, idx) => (
                  <div key={id} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded text-sm">
                    <span className="text-text-secondary">{idx + 1}. {id.slice(-6)}</span>
                    <button onClick={() => toggleQuestion(id)} className="text-red-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              className="w-full mt-4"
              onClick={handleSubmit}
              loading={saving}
              disabled={!title.trim() || selectedIds.length === 0}
            >
              <ClipboardCheck className="w-4 h-4 mr-1" />
              시험 저장 ({selectedIds.length}문제)
            </Button>
          </Card>
        </div>

        {/* Right: Question browser */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-base font-bold text-text-primary mb-4">문제 선택</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={bookCode}
                onChange={(e) => setBookCode(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              >
                {BOOK_CODES.map((c) => (
                  <option key={c} value={c}>{BOOK_LABELS[c]}</option>
                ))}
              </select>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              >
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d === '전체' ? '전체 난이도' : DIFFICULTY_LABELS[d as QuestionDifficulty]}
                  </option>
                ))}
              </select>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="문제 검색..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Question list */}
            {searchLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : questions.length === 0 ? (
              <p className="text-center text-text-secondary py-12">검색 결과가 없습니다</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {questions.map((q) => {
                  const isSelected = selectedIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-500">
                              {q.chapter} #{q.questionNum}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              q.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                              q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {DIFFICULTY_LABELS[q.difficulty]}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
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
