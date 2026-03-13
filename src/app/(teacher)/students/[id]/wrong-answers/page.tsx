'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { MathStatusBadge } from '@/components/ui/MathStatusBadge';
import { DIFFICULTY_LABELS } from '@/types';

interface WrongAnswerItem {
  question: {
    id: string;
    content: string;
    choices: string[] | null;
    answer: string;
    explanation: string | null;
    difficulty: string;
    chapter: string;
    section: string | null;
    bookCode: string;
    questionNum: number;
  };
  lastWrongAnswer: string;
  lastWrongAt: string;
  timeSpent: number;
  testTitle: string;
}

interface SimilarQuestion {
  id: string;
  questionNum: number;
  difficulty: string;
  section: string | null;
  bookCode: string;
}

interface WrongAnswerStats {
  totalWrongQuestions: number;
  chapterStats: Record<string, number>;
}

export default function WrongAnswersPage() {
  const { id: studentSeq } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WrongAnswerItem[]>([]);
  const [stats, setStats] = useState<WrongAnswerStats | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [filterChapter, setFilterChapter] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [similarMap, setSimilarMap] = useState<Record<string, SimilarQuestion[]>>({});

  // Resolve student seq to real ID
  useEffect(() => {
    async function resolveStudent() {
      try {
        const res = await fetch('/api/users?role=STUDENT');
        if (res.ok) {
          const json = await res.json();
          const seqNum = Number(studentSeq);
          const student = (json.data ?? []).find(
            (u: { id: string; seq: number }) =>
              (!isNaN(seqNum) && u.seq === seqNum) || u.id === studentSeq
          );
          if (student) {
            setStudentId(student.id);
            setStudentName(student.name);
          }
        }
      } catch { /* ignore */ }
    }
    resolveStudent();
  }, [studentSeq]);

  useEffect(() => {
    if (!studentId) return;
    async function load() {
      try {
        const params = new URLSearchParams({ studentId: studentId! });
        if (filterChapter) params.set('chapter', filterChapter);
        if (filterDifficulty) params.set('difficulty', filterDifficulty);

        const wrongRes = await fetch(`/api/questions/wrong-answers?${params}`);

        if (wrongRes.ok) {
          const json = await wrongRes.json();
          setItems(json.data ?? []);
          setStats(json.stats ?? null);
          setSimilarMap(json.similarQuestions ?? {});
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [studentId, filterChapter, filterDifficulty]);

  const toggleSelect = (qId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.question.id)));
    }
  };

  const createTestFromWrongAnswers = async () => {
    if (selectedIds.size === 0) return;

    const questionIds = [...selectedIds];
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${studentName} 오답 복습 시험`,
          grade: 7,
          testType: 'concept',
          questionIds,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        alert(`오답 기반 시험이 생성되었습니다! (${questionIds.length}문제)`);
        window.location.href = `/tests/${json.data.seq}/results`;
      }
    } catch {
      alert('시험 생성에 실패했습니다');
    }
  };

  const chapters = stats?.chapterStats
    ? Object.entries(stats.chapterStats).sort((a, b) => b[1] - a[1])
    : [];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/students" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {studentName || '학생'} 오답 관리
            </h1>
            <p className="text-sm text-text-secondary">
              총 {stats?.totalWrongQuestions ?? 0}개의 오답 문제
            </p>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <Button onClick={createTestFromWrongAnswers}>
            <FileText className="w-4 h-4 mr-1" />
            선택 {selectedIds.size}문제로 시험 생성
          </Button>
        )}
      </div>

      {/* 단원별 오답 분포 */}
      {chapters.length > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            취약 단원 분포
          </h3>
          <div className="flex flex-wrap gap-2">
            {chapters.map(([chapter, count]) => (
              <button
                key={chapter}
                onClick={() => setFilterChapter(filterChapter === chapter ? '' : chapter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterChapter === chapter
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                {chapter} ({count})
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-text-secondary" />
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
        >
          <option value="">전체 난이도</option>
          <option value="BASIC">하</option>
          <option value="MEDIUM">중</option>
          <option value="HIGH">상</option>
          <option value="HIGHEST">최상</option>
        </select>
        <button
          onClick={selectAll}
          className="text-xs text-primary hover:underline"
        >
          {selectedIds.size === items.length ? '전체 해제' : '전체 선택'}
        </button>
      </div>

      {/* 오답 문제 목록 */}
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-text-secondary">오답 문제가 없습니다</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const q = item.question;
            const isSelected = selectedIds.has(q.id);
            const isExpanded = expandedId === q.id;
            const similar = similarMap[q.id] ?? [];

            return (
              <Card
                key={q.id}
                className={`overflow-hidden transition-all ${
                  isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                }`}
              >
                {/* Main row */}
                <div className="flex items-start gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(q.id)}
                    className="mt-1 accent-primary shrink-0"
                  />
                  <div className="flex-shrink-0 pt-0.5">
                    <MathStatusBadge
                      isCorrect={false}
                      timeSpentSeconds={item.timeSpent}
                      difficulty={q.difficulty}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-500">
                        {q.chapter} · #{q.questionNum}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        q.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS]}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.testTitle}
                      </span>
                    </div>
                    <div className="text-sm text-text-primary line-clamp-2 mb-1">
                      <MathRenderer content={q.content.slice(0, 200)} />
                    </div>
                    <div className="text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                      학생 답: <span className="text-red-600 font-medium">{item.lastWrongAnswer}</span>
                      · 정답: <span className="text-emerald-600 font-medium">{q.answer}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{item.timeSpent}초</span>
                      {similar.length > 0 && (
                        <span className="text-primary font-semibold flex items-center gap-0.5">
                          <RefreshCw className="w-3 h-3" />유사 {similar.length}문항
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="shrink-0 text-text-secondary hover:text-text-primary p-1"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-4">
                    {/* Full question */}
                    <div>
                      <p className="text-xs font-bold text-text-secondary mb-1.5">문제 전문</p>
                      <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm">
                        <MathRenderer content={q.content} />
                      </div>
                    </div>

                    {/* Choices */}
                    {q.choices && Array.isArray(q.choices) && (q.choices as string[]).length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-text-secondary mb-1.5">보기</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {(q.choices as string[]).map((choice, idx) => {
                            const isStudentAnswer = item.lastWrongAnswer === String(idx + 1) || item.lastWrongAnswer === choice;
                            const isCorrectAnswer = q.answer === String(idx + 1) || q.answer === choice;
                            return (
                              <div
                                key={idx}
                                className={`px-3 py-2 rounded-lg text-xs border ${
                                  isCorrectAnswer
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold'
                                    : isStudentAnswer
                                      ? 'border-red-300 bg-red-50 text-red-700'
                                      : 'border-slate-200 bg-white text-text-secondary'
                                }`}
                              >
                                <MathRenderer content={choice} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Answer comparison */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-red-600 mb-1">학생 답안</p>
                        <div className="text-sm text-red-800 font-medium">
                          <MathRenderer content={item.lastWrongAnswer} />
                        </div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-emerald-600 mb-1">정답</p>
                        <div className="text-sm text-emerald-800 font-medium">
                          <MathRenderer content={q.answer} />
                        </div>
                      </div>
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div>
                        <p className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-amber-500" /> 해설
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                          <MathRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}

                    {/* Similar questions (twin questions) */}
                    {similar.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-primary" /> 유사 문항 (쌍둥이 문제)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {similar.map((sq) => (
                            <div
                              key={sq.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-primary/20 rounded-lg text-xs"
                            >
                              <span className="font-semibold text-text-primary">
                                {sq.bookCode} #{sq.questionNum}
                              </span>
                              <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                sq.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                                sq.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                sq.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {DIFFICULTY_LABELS[sq.difficulty as keyof typeof DIFFICULTY_LABELS]}
                              </span>
                              {sq.section && (
                                <span className="text-text-secondary truncate max-w-[120px]">
                                  {sq.section}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-text-secondary mt-1.5">
                          같은 단원·난이도의 다른 문제입니다. 재출제용으로 활용하세요.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
