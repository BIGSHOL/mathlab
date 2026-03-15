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
import {
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  BOOK_LABELS,
  DOMAIN_LABELS,
  DOMAIN_COLORS,
} from '@/types';
import type { QuestionDifficulty, QuestionType, LevelTestDomain } from '@/types';

const DOMAIN_ORDER: LevelTestDomain[] = ['CALCULATION', 'UNDERSTANDING', 'PROBLEM_SOLVING', 'REASONING'];
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

export default function CreateLevelTestPage() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState(7);
  const [timeLimitMin, setTimeLimitMin] = useState<number | ''>('');
  const [questionsPerPage, setQuestionsPerPage] = useState<number | ''>(''); // '' = 자동
  const [spacing, setSpacing] = useState<'compact' | 'normal' | 'wide'>('normal');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [questionDomains, setQuestionDomains] = useState<Record<string, LevelTestDomain>>({});
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

  // Domain button click handler
  const handleDomainClick = (questionId: string, domain: LevelTestDomain) => {
    const isSelected = selectedIds.includes(questionId);
    const currentDomain = questionDomains[questionId];

    if (!isSelected) {
      // Not selected -> add to selectedIds + set domain
      setSelectedIds((prev) => [...prev, questionId]);
      setQuestionDomains((prev) => ({ ...prev, [questionId]: domain }));
    } else if (currentDomain === domain) {
      // Same domain -> deselect (remove from selectedIds + remove domain)
      setSelectedIds((prev) => prev.filter((x) => x !== questionId));
      setQuestionDomains((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } else {
      // Different domain -> update domain
      setQuestionDomains((prev) => ({ ...prev, [questionId]: domain }));
    }
  };

  // Remove question from selected list
  const removeQuestion = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setQuestionDomains((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Domain summary counts
  const domainCounts = DOMAIN_ORDER.reduce((acc, domain) => {
    acc[domain] = Object.values(questionDomains).filter((d) => d === domain).length;
    return acc;
  }, {} as Record<LevelTestDomain, number>);

  // Check if any selected question is missing a domain
  const hasQuestionWithoutDomain = selectedIds.some((id) => !questionDomains[id]);

  // Save disabled condition
  const saveDisabled = !title.trim() || selectedIds.length === 0 || hasQuestionWithoutDomain;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/level-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          grade,
          questionIds: selectedIds,
          questionDomains,
          timeLimitMin: timeLimitMin || null,
          questionsPerPage: questionsPerPage || null,
          spacing,
        }),
      });
      if (res.ok) {
        router.push('/level-test');
      } else {
        alert('레벨테스트 저장에 실패했습니다.');
      }
    } catch {
      alert('레벨테스트 저장에 실패했습니다.');
    }
    setSaving(false);
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left panel: settings */}
      <div className="w-[340px] flex-shrink-0 border-r border-slate-200 overflow-y-auto p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/level-test" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">레벨테스트 만들기</h1>
        </div>

        {/* Test info */}
        <Card className="p-5">
          <h2 className="text-base font-bold text-text-primary mb-4">테스트 정보</h2>

          <label className="block mb-3">
            <span className="text-sm font-medium text-text-secondary">테스트 제목 *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 중1 레벨테스트"
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
        </Card>

        {/* Print layout settings */}
        <Card className="p-5">
          <h2 className="text-base font-bold text-text-primary mb-4">인쇄 설정</h2>

          <label className="block mb-3">
            <span className="text-sm font-medium text-text-secondary">페이지당 문제 수</span>
            <input
              type="number"
              value={questionsPerPage}
              onChange={(e) => setQuestionsPerPage(e.target.value ? Number(e.target.value) : '')}
              placeholder="자동 (문제 길이 기반)"
              min={1}
              max={30}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              비워두면 문제 길이에 따라 자동 배분
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-text-secondary">풀이 여백</span>
            <div className="mt-1.5 flex gap-2">
              {(['compact', 'normal', 'wide'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpacing(s)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    spacing === s
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-secondary border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s === 'compact' ? '좁게' : s === 'normal' ? '보통' : '넓게'}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              풀이 공간 여백 크기를 조절합니다
            </span>
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
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedIds.map((id, idx) => {
                const domain = questionDomains[id];
                return (
                  <div key={id} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-text-secondary flex-shrink-0">{idx + 1}.</span>
                      <span className="text-text-secondary truncate">{id.slice(-6)}</span>
                      {domain && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${DOMAIN_COLORS[domain].bg} ${DOMAIN_COLORS[domain].text}`}>
                          {DOMAIN_LABELS[domain]}
                        </span>
                      )}
                    </div>
                    <button onClick={() => removeQuestion(id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Domain summary */}
          {selectedIds.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-text-secondary mb-2">영역별 문제 수</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {DOMAIN_ORDER.map((domain) => (
                  <div
                    key={domain}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs ${DOMAIN_COLORS[domain].bg}`}
                  >
                    <span className={`font-medium ${DOMAIN_COLORS[domain].text}`}>
                      {DOMAIN_LABELS[domain]}
                    </span>
                    <span className={`font-bold ${DOMAIN_COLORS[domain].text}`}>
                      {domainCounts[domain]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasQuestionWithoutDomain && selectedIds.length > 0 && (
            <p className="text-xs text-red-500 mt-2">모든 문제에 영역을 지정해주세요</p>
          )}

          <Button
            className="w-full mt-4"
            onClick={handleSave}
            loading={saving}
            disabled={saveDisabled}
          >
            <ClipboardCheck className="w-4 h-4 mr-1" />
            레벨테스트 저장 ({selectedIds.length}문제)
          </Button>
        </Card>
      </div>

      {/* Right panel: question browser */}
      <div className="flex-1 overflow-y-auto p-5">
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
            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
              {questions.map((q) => {
                const isSelected = selectedIds.includes(q.id);
                const assignedDomain = questionDomains[q.id];
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-lg border transition-all ${
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
                        <div className="text-sm text-text-primary line-clamp-2 mb-2">
                          <MathRenderer content={q.content.slice(0, 150)} />
                        </div>
                        {/* Domain buttons */}
                        <div className="flex gap-1.5">
                          {DOMAIN_ORDER.map((domain) => {
                            const isActive = isSelected && assignedDomain === domain;
                            const isDbDomain = !isSelected && q.domain === domain;
                            const colors = DOMAIN_COLORS[domain];
                            return (
                              <button
                                key={domain}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDomainClick(q.id, domain);
                                }}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                                  isActive
                                    ? `${colors.bg} ${colors.text} border-current`
                                    : isDbDomain
                                      ? `${colors.bg} ${colors.text} border-transparent opacity-60`
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-500'
                                }`}
                              >
                                {DOMAIN_LABELS[domain]}
                              </button>
                            );
                          })}
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
  );
}
