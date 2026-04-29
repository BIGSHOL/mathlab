'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Plus, Users, Clock, CheckCircle2,
  ChevronDown, ChevronRight, ChevronUp,
  CheckSquare, Square, MinusSquare, Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer } from '@/components/ui/PageContainer';
import { toast } from '@/components/ui/Toast';
import { getCurriculumForGrade, type SemesterEntry } from '@/lib/utils/curriculumMapping';
import type { CurriculumUnit } from '@/types/mathgen';
import { DIFFICULTY_LABELS, TYPE_LABELS } from '@/types';

// ── 타입 ──

interface QuizSessionItem {
  id: string;
  title: string;
  joinCode: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  currentQ: number;
  createdAt: string;
  _count: { participants: number; sessionQuestions: number };
}

const STATUS_LABELS: Record<string, string> = { WAITING: '대기 중', ACTIVE: '진행 중', COMPLETED: '종료' };
const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success'> = { WAITING: 'info', ACTIVE: 'warning', COMPLETED: 'success' };

// ── 교육과정 데이터 ──

interface BookCodeOption {
  code: string;
  label: string;
  grade: string; // curriculumMapping 용
  semester: number;
}

const BOOK_CODE_OPTIONS: BookCodeOption[] = [
  { code: '1-1', label: '중1-1', grade: 'middle_1', semester: 1 },
  { code: '1-2', label: '중1-2', grade: 'middle_1', semester: 2 },
  { code: '2-1', label: '중2-1', grade: 'middle_2', semester: 1 },
  { code: '2-2', label: '중2-2', grade: 'middle_2', semester: 2 },
  { code: '3-1', label: '중3-1', grade: 'middle_3', semester: 1 },
  { code: '3-2', label: '중3-2', grade: 'middle_3', semester: 2 },
];

const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_LABELS) as [string, string][];
const TYPE_OPTIONS = Object.entries(TYPE_LABELS) as [string, string][];
const PRESET_COUNTS = [5, 10, 15, 20];

// ── 메인 ──

export default function QuizPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<QuizSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // 생성 폼 상태
  const [title, setTitle] = useState('');
  const [selectedBookCode, setSelectedBookCode] = useState('1-1');
  const [checkedChapters, setCheckedChapters] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // 교육과정 트리 상태
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});

  // ── 세션 목록 ──
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/quiz');
      if (res.ok) setSessions((await res.json()).data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── 교육과정 데이터 ──
  const curriculumEntries = useMemo((): SemesterEntry[] => {
    const opt = BOOK_CODE_OPTIONS.find((o) => o.code === selectedBookCode);
    if (!opt) return [];
    return getCurriculumForGrade(opt.grade).filter((e) => e.semesterNumber === opt.semester);
  }, [selectedBookCode]);

  const allChapterKeys = useMemo(() => {
    const keys: string[] = [];
    for (const sem of curriculumEntries) {
      for (const ch of sem.chapters) {
        keys.push(`${selectedBookCode}|${ch.name}`);
      }
    }
    return keys;
  }, [curriculumEntries, selectedBookCode]);

  // bookCode 변경 시 초기화
  useEffect(() => {
    setCheckedChapters([]);
    setExpanded(new Set(['all']));
    // 단원별 문제 수 로드
    const loadCounts = async () => {
      try {
        const res = await fetch(`/api/questions?bookCode=${selectedBookCode}&limit=1`);
        if (!res.ok) return;
        // 전체 문제 수만 확인 (개별 단원은 간소화)
        const json = await res.json();
        const total = json.meta?.total ?? 0;
        setChapterCounts({ [`${selectedBookCode}|_total`]: total });
      } catch { /* ignore */ }
    };
    loadCounts();
  }, [selectedBookCode]);

  // ── 체크 토글 ──
  const toggleAllChapters = useCallback(() => {
    const allChecked = allChapterKeys.every((k) => checkedChapters.includes(k));
    setCheckedChapters(allChecked ? [] : [...allChapterKeys]);
  }, [allChapterKeys, checkedChapters]);

  const toggleChapter = useCallback((key: string) => {
    setCheckedChapters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const toggleExpand = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // ── 난이도/타입 토글 ──
  const toggleDifficulty = useCallback((key: string) => {
    setDifficultyFilter((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  }, []);

  const toggleType = useCallback((key: string) => {
    setTypeFilter((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  }, []);

  // ── 퀴즈 생성 ──
  const handleCreate = useCallback(async () => {
    if (!title.trim()) { toast.warning('퀴즈 제목을 입력하세요'); return; }
    if (checkedChapters.length === 0) { toast.warning('단원을 1개 이상 선택하세요'); return; }

    setCreating(true);
    try {
      // 선택된 단원에서 문제 가져오기
      const allQuestions: { id: string; bookCode: string; chapter: string; questionNum: number }[] = [];
      const seenIds = new Set<string>();

      const queryPairs = checkedChapters.map((key) => {
        const [bc, chapter] = key.split('|');
        return { bookCode: bc, chapter };
      });

      for (const { bookCode, chapter } of queryPairs) {
        let page = 1;
        while (true) {
          const params = new URLSearchParams({ bookCode, chapter, limit: '100', page: String(page) });
          if (difficultyFilter.length === 1) params.set('difficulty', difficultyFilter[0]);
          if (typeFilter.length === 1) params.set('type', typeFilter[0]);
          const res = await fetch(`/api/questions?${params}`);
          if (!res.ok) break;
          const json = await res.json();
          const data = json.data ?? [];
          if (data.length === 0) break;
          for (const q of data) {
            if (seenIds.has(q.id)) continue;
            if (difficultyFilter.length > 0 && !difficultyFilter.includes(q.difficulty)) continue;
            if (typeFilter.length > 0 && !typeFilter.includes(q.type)) continue;
            seenIds.add(q.id);
            allQuestions.push({ id: q.id, bookCode: q.bookCode, chapter: q.chapter, questionNum: q.questionNum });
          }
          if (data.length < 100) break;
          page++;
        }
      }

      if (allQuestions.length === 0) {
        toast.warning('선택한 범위에 문제가 없습니다');
        setCreating(false);
        return;
      }

      // 셔플 후 필요한 수만큼 샘플링
      let selected = allQuestions;
      if (selected.length > questionCount) {
        for (let i = selected.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [selected[i], selected[j]] = [selected[j], selected[i]];
        }
        selected = selected.slice(0, questionCount);
      }

      // 교육과정 순으로 정렬
      selected.sort((a, b) =>
        a.bookCode.localeCompare(b.bookCode) ||
        a.chapter.localeCompare(b.chapter, 'ko') ||
        a.questionNum - b.questionNum
      );

      const questionIds = selected.map((q) => q.id);

      // 퀴즈 생성
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, questionIds }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`${questionIds.length}문제로 퀴즈 생성!`);
        router.push(`/quiz/${json.data.joinCode}/host`);
      } else {
        toast.error('퀴즈 생성 실패');
      }
    } catch {
      toast.error('퀴즈 생성 실패');
    }
    setCreating(false);
  }, [title, checkedChapters, difficultyFilter, typeFilter, questionCount, router]);

  // ── UI 헬퍼 ──
  const checkedCount = allChapterKeys.filter((k) => checkedChapters.includes(k)).length;
  const totalCount = chapterCounts[`${selectedBookCode}|_total`] ?? 0;
  const AllCheckIcon = checkedCount === allChapterKeys.length && allChapterKeys.length > 0
    ? CheckSquare : checkedCount > 0 ? MinusSquare : Square;

  return (
    <LoadingEmptyState loading={loading} empty={false}>
      <PageContainer maxWidth="xl">
        <PageHeader
          title="퀴즈 배틀"
          icon={<Zap className="w-6 h-6 text-yellow-500" />}
          actions={
            <Button onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? <ChevronUp className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {showCreate ? '닫기' : '새 퀴즈'}
            </Button>
          }
        />

        {/* ══════════════════════════════════ */}
        {/* 생성 폼 */}
        {/* ══════════════════════════════════ */}
        {showCreate && (
          <Card padding="md" className="mb-6">
            {/* 제목 */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="퀴즈 제목 (예: 방정식 스피드 퀴즈)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-sm text-sm mb-4"
            />

            <div className="flex gap-4 flex-col md:flex-row">
              {/* ── 좌: 교육과정 선택 ── */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-text-primary mb-2">범위 선택</h4>

                {/* 학년·학기 버튼 */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {BOOK_CODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => setSelectedBookCode(opt.code)}
                      className={`px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors ${
                        selectedBookCode === opt.code
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* 단원 트리 */}
                <div className="border border-slate-200 rounded-sm max-h-56 overflow-y-auto">
                  {/* 전체 선택 헤더 */}
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border-b border-slate-100"
                    onClick={toggleAllChapters}
                  >
                    <AllCheckIcon className={`w-4 h-4 ${checkedCount > 0 ? 'text-primary' : 'text-slate-300'}`} />
                    <span className="text-sm font-semibold text-text-primary">전체 선택</span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {checkedCount}/{allChapterKeys.length}단원
                      {totalCount > 0 && ` · ${totalCount}문제`}
                    </span>
                  </button>

                  {/* 단원 목록 */}
                  {curriculumEntries.map((sem) =>
                    sem.chapters.map((ch) => {
                      const key = `${selectedBookCode}|${ch.name}`;
                      const isChecked = checkedChapters.includes(key);
                      const hasChildren = ch.subUnits && ch.subUnits.length > 0;
                      const isExpanded = expanded.has(key);

                      return (
                        <div key={key}>
                          <div
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                              isChecked ? 'bg-primary/5' : 'hover:bg-slate-50'
                            }`}
                          >
                            {hasChildren && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleExpand(key); }}
                                className="shrink-0"
                              >
                                {isExpanded
                                  ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                  : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                }
                              </button>
                            )}
                            {!hasChildren && <span className="w-3.5" />}
                            <button
                              onClick={() => toggleChapter(key)}
                              className="shrink-0"
                            >
                              {isChecked
                                ? <CheckSquare className="w-4 h-4 text-primary" />
                                : <Square className="w-4 h-4 text-slate-300" />
                              }
                            </button>
                            <span
                              className="text-sm text-text-secondary flex-1 truncate cursor-pointer"
                              onClick={() => toggleChapter(key)}
                            >
                              {ch.name}
                            </span>
                          </div>
                          {/* 소단원 (중단원의 children) */}
                          {hasChildren && isExpanded && ch.subUnits!.map((sub: CurriculumUnit) => (
                            <div key={sub.name} className="flex items-center gap-2 pl-12 pr-3 py-1.5 text-xs text-slate-400">
                              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                              <span className="truncate">{sub.name}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── 우: 설정 ── */}
              <div className="w-full md:w-56 shrink-0 space-y-4">
                {/* 문제 수 */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2">문제 수</h4>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COUNTS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setQuestionCount(n)}
                        className={`px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors ${
                          questionCount === n
                            ? 'border-primary bg-blue-50 text-primary'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={questionCount}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v > 0 && v <= 50) setQuestionCount(v);
                      }}
                      className="w-14 px-2 py-1.5 rounded-sm border border-slate-200 text-sm text-center"
                    />
                  </div>
                </div>

                {/* 난이도 */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2">난이도</h4>
                  <div className="flex gap-1 flex-wrap">
                    {DIFFICULTY_OPTIONS.map(([key, label]) => {
                      const active = difficultyFilter.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleDifficulty(key)}
                          className={`px-2.5 py-1 rounded-sm text-xs font-medium border transition-colors ${
                            active
                              ? 'border-primary bg-blue-50 text-primary'
                              : difficultyFilter.length === 0
                                ? 'border-primary/30 bg-blue-50/50 text-primary/70'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {difficultyFilter.length === 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">전체 난이도</p>
                  )}
                </div>

                {/* 문제 타입 */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2">유형</h4>
                  <div className="flex gap-1 flex-wrap">
                    {TYPE_OPTIONS.map(([key, label]) => {
                      const active = typeFilter.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleType(key)}
                          className={`px-2.5 py-1 rounded-sm text-xs font-medium border transition-colors ${
                            active
                              ? 'border-primary bg-blue-50 text-primary'
                              : typeFilter.length === 0
                                ? 'border-primary/30 bg-blue-50/50 text-primary/70'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {typeFilter.length === 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">전체 유형</p>
                  )}
                </div>

                {/* 퀴즈 시작 */}
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={creating || !title.trim() || checkedChapters.length === 0}
                  loading={creating}
                >
                  {creating ? (
                    <>문제 선택 중...</>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      퀴즈 시작 ({questionCount}문제)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ══════════════════════════════════ */}
        {/* 세션 목록 */}
        {/* ══════════════════════════════════ */}
        <LoadingEmptyState
          loading={false}
          empty={sessions.length === 0}
          icon={<Zap className="w-10 h-10 text-slate-300" />}
          message="아직 생성된 퀴즈가 없습니다"
        >
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card
                key={s.id}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => router.push(`/quiz/${s.joinCode}/host`)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-sm">
                    <Zap className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">{s.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
                      <span className="font-mono font-bold text-primary">{s.joinCode}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {s._count.participants}명
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s._count.sessionQuestions}문제
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[s.status]}>
                  {s.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {STATUS_LABELS[s.status]}
                </Badge>
              </Card>
            ))}
          </div>
        </LoadingEmptyState>
      </PageContainer>
    </LoadingEmptyState>
  );
}
