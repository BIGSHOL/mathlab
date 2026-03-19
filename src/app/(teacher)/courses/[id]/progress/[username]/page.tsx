'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  GraduationCap,
  BookOpen,
  CheckCircle,
  Circle,
  Lock,
  Loader2,
  Clock,
  Target,
  BarChart3,
  Eye,
  Hash,
  Lightbulb,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { InlineMathText } from '@/components/math/InlineMathText';
import { MathRenderer } from '@/components/math/MathRenderer';

/* ─── Types ─── */

interface BlankItem {
  position: number;
  answer: string;
  hint: string;
  difficulty?: 'easy' | 'hard' | 'full';
}

interface StageData {
  completed: boolean;
  completedAt: string | null;
  attempts: number;
  score: number | null;
  hintCount: number;
  revealCount: number;
}

interface AnswerLogItem {
  blankPosition: number;
  submittedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface BlankAttemptItem {
  id: string;
  stage: string;
  score: number;
  allCorrect: boolean;
  createdAt: string;
  answers: AnswerLogItem[];
}

interface ConceptProgress {
  id: string;
  title: string;
  chapter: string | null;
  section: string | null;
  sortOrder: number;
  stages: Record<string, StageData | null>;
  isCompleted: boolean;
  currentStage: string;
  fullContent: string | null;
  blankExercise: { templateText: string; blanks: BlankItem[] } | null;
  blankAttempts: BlankAttemptItem[];
}

interface ProgressData {
  course: { seq: number; title: string };
  student: { name: string; username: string; grade: number | null };
  enrollment: { status: string; startedAt: string | null; completedAt: string | null };
  concepts: ConceptProgress[];
  summary: { completed: number; total: number; percent: number };
}

/* ─── Constants ─── */

const STAGE_META = [
  { key: 'READING', label: '읽기', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  { key: 'BLANK_EASY', label: '쉬움', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { key: 'BLANK_HARD', label: '어려움', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  { key: 'BLANK_FULL', label: '통문장', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-500' },
];

const DIFF_LABEL: Record<string, string> = { easy: '쉬움', hard: '어려움', full: '통문장' };
const DIFF_COLOR: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  hard: 'bg-orange-100 text-orange-700 border-orange-300',
  full: 'bg-violet-100 text-violet-700 border-violet-300',
};

/** LaTeX $...$ 구분자를 제거하고 읽기 쉬운 텍스트로 변환 (HTML span 내에서 사용) */
function stripLatexDelimiters(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_, inner: string) =>
    inner
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
      .replace(/\\pm/g, '±').replace(/\\times/g, '×').replace(/\\div/g, '÷')
      .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\ldots/g, '…').replace(/\\cdot/g, '·')
      .replace(/\\neq/g, '≠').replace(/\\geq/g, '≥').replace(/\\leq/g, '≤')
      .replace(/\\approx/g, '≈')
      .replace(/[{}]/g, '').replace(/\\/g, '').trim()
  );
}

function escapeBlankHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─── Page ─── */

export default function StudentProgressPage() {
  const { id, username } = useParams<{ id: string; username: string }>();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/learning-courses/${id}/progress/${username}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data);
        if (json.data?.concepts?.length > 0) setSelectedIdx(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-6 py-8 max-w-[1000px] mx-auto">
        <Card className="p-12 text-center">
          <p className="text-text-secondary">데이터를 찾을 수 없습니다.</p>
          <Link href={`/courses/${id}`} className="text-primary text-sm hover:underline mt-2 inline-block">
            과정으로 돌아가기
          </Link>
        </Card>
      </div>
    );
  }

  const selected = selectedIdx !== null ? data.concepts[selectedIdx] : null;

  return (
    <div className="px-5 py-6">
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/courses/${id}`} className="p-1.5 rounded-sm hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            {data.student.name}의 학습 진행
          </h1>
          <p className="text-text-secondary text-xs mt-0.5">{data.course.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <Target className="w-3.5 h-3.5" />
            {data.summary.percent}%
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            {data.summary.completed}/{data.summary.total}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-text-secondary text-xs">
            <Clock className="w-3 h-3" />
            {data.enrollment.startedAt ? new Date(data.enrollment.startedAt).toLocaleDateString('ko-KR') : '-'}
          </span>
        </div>
      </div>

      <div className="mb-5">
        <ProgressBar value={data.summary.percent} size="sm" />
      </div>

      {/* ── 메인: 개념 리스트 + 상세 ── */}
      <div className="flex gap-4" style={{ height: 'calc(100vh - 190px)' }}>
        {/* 왼쪽: 개념 리스트 */}
        <div className="w-[260px] shrink-0 flex flex-col">
          <h2 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            학습 개념 ({data.concepts.length})
          </h2>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 pr-0.5">
            {data.concepts.map((concept, idx) => {
              const completedStages = STAGE_META.filter((s) => concept.stages[s.key]?.completed).length;
              const isSelected = selectedIdx === idx;
              return (
                <button
                  key={concept.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : concept.isCompleted
                        ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      concept.isCompleted
                        ? 'bg-emerald-500 text-white'
                        : concept.currentStage !== 'NOT_STARTED'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {concept.isCompleted ? <CheckCircle className="w-3 h-3" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{concept.title}</div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {STAGE_META.map((stage) => (
                          <div
                            key={stage.key}
                            className={`w-1.5 h-1.5 rounded-full ${
                              concept.stages[stage.key]?.completed ? stage.dot
                                : concept.currentStage === stage.key ? 'bg-primary animate-pulse'
                                  : 'bg-slate-200'
                            }`}
                          />
                        ))}
                        <span className="text-[9px] text-text-secondary ml-0.5">{completedStages}/4</span>
                      </div>
                    </div>
                    {isSelected && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 오른쪽: 선택 개념 상세 (전체 나머지 폭 사용) */}
        <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
          {selected ? (
            <ConceptDetailPanel concept={selected} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-text-secondary text-sm">왼쪽에서 개념을 선택하세요</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Concept Detail Panel ─── */

function ConceptDetailPanel({ concept }: { concept: ConceptProgress }) {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 상단: 제목 + 4단계 진행 카드 (가로로 넓게) */}
      <div className="flex items-start gap-4">
        {/* 제목 + 상태 */}
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary">{concept.title}</h2>
            {concept.isCompleted ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold border border-emerald-200">
                <CheckCircle className="w-3 h-3" />완료
              </span>
            ) : concept.currentStage !== 'NOT_STARTED' ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                <Circle className="w-3 h-3" />진행 중
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 text-[11px] font-bold">
                <Lock className="w-3 h-3" />대기
              </span>
            )}
          </div>
          {concept.chapter && (
            <p className="text-xs text-text-secondary mt-0.5">{concept.chapter}{concept.section ? ` · ${concept.section}` : ''}</p>
          )}
        </div>

        {/* 4단계 카드 — 나머지 공간 다 사용 */}
        <div className="flex-1 grid grid-cols-4 gap-2">
          {STAGE_META.map((stage) => {
            const s = concept.stages[stage.key];
            const done = s?.completed === true;
            const active = concept.currentStage === stage.key;
            return (
              <div
                key={stage.key}
                className={`relative px-3 py-2 rounded-lg border transition-all ${
                  done
                    ? `${stage.bg} ${stage.border}`
                    : active
                      ? 'bg-primary/5 border-primary ring-2 ring-primary/30 animate-[pulse-border_2s_ease-in-out_infinite]'
                      : 'bg-slate-50 border-slate-100'
                }`}
              >
                {active && !done && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold whitespace-nowrap animate-pulse shadow-sm">
                    진행중
                  </span>
                )}
                <div className="flex items-center gap-1 mb-1">
                  {done ? <CheckCircle className={`w-3.5 h-3.5 ${stage.color}`} /> : active ? <Circle className="w-3.5 h-3.5 text-primary animate-pulse" /> : <Lock className="w-3.5 h-3.5 text-slate-300" />}
                  <span className={`text-[11px] font-bold ${done ? stage.color : active ? 'text-primary' : 'text-slate-300'}`}>{stage.label}</span>
                </div>
                {s ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {s.score !== null && <span className="flex items-center gap-0.5 text-[10px] text-text-secondary"><BarChart3 className="w-2.5 h-2.5" />{s.score}점</span>}
                    <span className="flex items-center gap-0.5 text-[10px] text-text-secondary"><Hash className="w-2.5 h-2.5" />{s.attempts}회</span>
                    {s.hintCount > 0 && <span className="flex items-center gap-0.5 text-[10px] text-text-secondary"><Lightbulb className="w-2.5 h-2.5" />힌트{s.hintCount}</span>}
                    {s.revealCount > 0 && <span className="flex items-center gap-0.5 text-[10px] text-text-secondary"><Eye className="w-2.5 h-2.5" />보기{s.revealCount}</span>}
                    {s.completedAt && <span className="text-[9px] text-text-secondary">{new Date(s.completedAt).toLocaleDateString('ko-KR')}</span>}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-300">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단: 개념 내용 + 빈칸 학습 좌우 배치 (가로 공간 최대 활용) */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
        {/* 왼쪽: 개념 내용 */}
        <Card className="flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-1.5 shrink-0">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-text-secondary">개념 내용</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {concept.fullContent ? (
              <MathRenderer content={concept.fullContent} className="text-sm leading-8 font-serif-kr" />
            ) : (
              <p className="text-sm text-text-secondary text-center py-8">개념 내용이 없습니다.</p>
            )}
          </div>
        </Card>

        {/* 오른쪽: 빈칸 학습 내용 + 답변 이력 */}
        <Card className="flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-1.5 shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-text-secondary">빈칸 학습 내용</span>
            {concept.blankAttempts.length > 0 && (
              <span className="ml-auto text-[10px] text-text-secondary">시도 {concept.blankAttempts.length}회</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {concept.blankExercise ? (
              <BlankAnswerViewer exercise={concept.blankExercise} attempts={concept.blankAttempts} />
            ) : (
              <p className="text-sm text-text-secondary text-center py-8">빈칸 문제가 없습니다.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Blank Answer Viewer ─── */

function BlankAnswerViewer({ exercise, attempts }: {
  exercise: { templateText: string; blanks: BlankItem[] };
  attempts: BlankAttemptItem[];
}) {
  const [viewLevel, setViewLevel] = useState<'easy' | 'hard' | 'full'>('easy');
  const [viewMode, setViewMode] = useState<'student' | 'answer' | 'history'>('student');
  const { templateText, blanks } = exercise;

  // 단계별 stage 매핑
  const LEVEL_TO_STAGE: Record<string, string> = { easy: 'BLANK_EASY', hard: 'BLANK_HARD', full: 'BLANK_FULL' };

  // 현재 단계의 최근 시도 (가장 최신)
  const latestAttempt = attempts.find((a) => a.stage === LEVEL_TO_STAGE[viewLevel]);

  // 최근 시도의 답변을 position별 맵으로 변환
  const submittedMap = new Map<number, AnswerLogItem>();
  if (latestAttempt) {
    for (const ans of latestAttempt.answers) {
      submittedMap.set(ans.blankPosition, ans);
    }
  }

  // templateText에 실제 {{N}} 플레이스홀더가 존재하는 빈칸만 사용
  const templatePositions = new Set<number>();
  templateText.replace(/\{\{(\d+)\}\}/g, (_, n) => { templatePositions.add(parseInt(n, 10)); return ''; });
  const activeBlanks = blanks.filter((b) => templatePositions.has(b.position));

  const shownBlanks = activeBlanks.filter((b) => {
    const diff = b.difficulty || 'easy';
    if (viewLevel === 'easy') return diff === 'easy';
    if (viewLevel === 'hard') return diff === 'easy' || diff === 'hard';
    return true;
  });
  const shownPositions = new Set(shownBlanks.map((b) => b.position));

  const easyCount = activeBlanks.filter((b) => (b.difficulty || 'easy') === 'easy').length;
  const hardCount = activeBlanks.filter((b) => b.difficulty === 'hard').length;

  const levels = [
    { key: 'easy' as const, label: '1단계', count: easyCount, color: 'text-emerald-600 border-emerald-300 bg-emerald-50' },
    { key: 'hard' as const, label: '2단계', count: easyCount + hardCount, color: 'text-orange-600 border-orange-300 bg-orange-50' },
    { key: 'full' as const, label: '통문장', count: activeBlanks.length, color: 'text-violet-600 border-violet-300 bg-violet-50' },
  ];

  // 현재 단계 시도 횟수
  const stageAttempts = attempts.filter((a) => a.stage === LEVEL_TO_STAGE[viewLevel]);

  // 빈칸을 HTML span으로 치환한 마크다운 (MathRenderer로 렌더링)
  const blankBase = 'display:inline;padding:1px 4px;border-radius:4px;font-size:13px;margin:0 2px;';
  const diffStyleMap: Record<string, string> = {
    easy: `${blankBase}background:#d1fae5;color:#047857;border:1px solid #6ee7b7;`,
    hard: `${blankBase}background:#ffedd5;color:#c2410c;border:1px solid #fdba74;`,
    full: `${blankBase}background:#ede9fe;color:#6d28d9;border:1px solid #c4b5fd;`,
  };

  // {{N}} → styled HTML span 변환 (bold 옵션 포함)
  const renderBlank = (num: number, bold: boolean): string => {
    const blank = blanks.find((b) => b.position === num);
    if (!blank) return `{{${num}}}`;
    if (!shownPositions.has(num)) return bold ? `**${stripLatexDelimiters(blank.answer)}**` : stripLatexDelimiters(blank.answer);

    const bw = bold ? 'font-weight:bold;' : '';
    const submitted = submittedMap.get(num);
    const ansText = escapeBlankHtml(stripLatexDelimiters(blank.answer));

    if (viewMode === 'student' && submitted) {
      const subText = escapeBlankHtml(stripLatexDelimiters(submitted.submittedAnswer));
      if (submitted.isCorrect) {
        return `<span style="${blankBase}${bw}background:#dcfce7;color:#15803d;border:1px solid #86efac;">${subText}</span>`;
      }
      return `<span style="${blankBase}${bw}background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;">${subText}</span><span style="font-size:11px;color:#15803d;margin-left:2px;"> → ${ansText}</span>`;
    }

    const diff = blank.difficulty || 'easy';
    return `<span style="${diffStyleMap[diff]}${bw}">${ansText}</span>`;
  };

  const processedContent = templateText
    // 1차: **{{N}}** (볼드 안의 빈칸) → bold span으로 치환
    .replace(/\*\*\{\{(\d+)\}\}\*\*/g, (_, numStr) => renderBlank(parseInt(numStr, 10), true))
    // 2차: 남은 {{N}} → 일반 span으로 치환
    .replace(/\{\{(\d+)\}\}/g, (_, numStr) => renderBlank(parseInt(numStr, 10), false));

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 단계 선택 */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        {levels.map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => { setViewLevel(key); setViewMode('student'); }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
              viewLevel === key && viewMode !== 'history' ? color : 'text-slate-400 border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {label} ({count})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {latestAttempt && (
            <button
              onClick={() => setViewMode(viewMode === 'answer' ? 'student' : 'answer')}
              className={`px-2 py-1 rounded-full text-[11px] font-bold border transition-all ${
                viewMode === 'answer' ? 'text-amber-600 border-amber-300 bg-amber-50' : 'text-slate-400 border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {viewMode === 'answer' ? '학생 답변' : '정답 보기'}
            </button>
          )}
          {attempts.length > 0 && (
            <button
              onClick={() => setViewMode(viewMode === 'history' ? 'student' : 'history')}
              className={`px-2 py-1 rounded-full text-[11px] font-bold border transition-all ${
                viewMode === 'history' ? 'text-primary border-primary bg-primary/5' : 'text-slate-400 border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              이력 ({stageAttempts.length})
            </button>
          )}
        </div>
      </div>

      {viewMode === 'history' ? (
        /* 답변 이력 뷰 (현재 단계만 필터) */
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-2">
          {stageAttempts.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">이 단계의 시도 기록이 없습니다.</p>
          ) : stageAttempts.map((attempt, aidx) => (
            <div key={attempt.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className={`px-3 py-2 flex items-center gap-2 text-xs ${attempt.allCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <span className="font-bold">#{stageAttempts.length - aidx}차 시도</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${attempt.allCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {attempt.score}점 {attempt.allCorrect ? '통과' : '미통과'}
                </span>
                <span className="ml-auto text-[10px] text-text-secondary">
                  {new Date(attempt.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="px-2 py-1.5 grid grid-cols-1 gap-0.5">
                {attempt.answers.map((ans) => (
                  <div key={ans.blankPosition} className="flex items-center gap-2 px-2 py-1 rounded text-xs">
                    <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-bold shrink-0">
                      {ans.blankPosition}
                    </span>
                    <span className={`flex-1 font-serif-kr ${ans.isCorrect ? 'text-emerald-700' : 'text-red-600 line-through'}`}>
                      <InlineMathText text={ans.submittedAnswer} />
                    </span>
                    {!ans.isCorrect && (
                      <span className="text-emerald-600 font-serif-kr text-[11px]">
                        → <InlineMathText text={ans.correctAnswer} />
                      </span>
                    )}
                    {ans.isCorrect ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-[9px] font-bold shrink-0">✕</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* 최근 시도 요약 배너 */}
          {viewMode === 'student' && latestAttempt && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${latestAttempt.allCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <span className="font-bold text-text-primary">최근 제출</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${latestAttempt.allCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {latestAttempt.score}점 {latestAttempt.allCorrect ? '통과' : '미통과'}
              </span>
              <span className="text-[10px] text-text-secondary ml-auto">
                {new Date(latestAttempt.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {viewMode === 'student' && !latestAttempt && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-200 shrink-0">
              <span className="text-text-secondary">이 단계의 제출 기록이 없습니다. 정답이 표시됩니다.</span>
            </div>
          )}

          {/* 빈칸 콘텐츠 — MathRenderer로 마크다운 서식 + 빈칸 렌더링 */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 bg-slate-50 rounded-lg border border-slate-200">
            <MathRenderer content={processedContent} className="text-sm leading-8 font-serif-kr" />
          </div>

          {/* 하단 요약 — 학생 답변 모드일 때 정답/오답 개수, 정답 모드일 때 정답 목록 */}
          <div className="shrink-0">
            {viewMode === 'student' && latestAttempt ? (
              <>
                <h4 className="text-[10px] font-bold text-text-secondary mb-1.5">
                  학생 답변 ({shownBlanks.length}개 중 {latestAttempt.answers.filter((a) => a.isCorrect && shownPositions.has(a.blankPosition)).length}개 정답)
                </h4>
                <div className="grid grid-cols-2 gap-1">
                  {shownBlanks.map((b) => {
                    const sub = submittedMap.get(b.position);
                    return (
                      <div key={b.position} className={`flex items-center gap-1.5 px-2 py-1 rounded border ${sub?.isCorrect ? 'border-emerald-200 bg-emerald-50' : sub ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                        <span className="shrink-0 w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-bold">
                          {b.position}
                        </span>
                        {sub ? (
                          <>
                            <span className={`text-xs flex-1 truncate font-serif-kr ${sub.isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
                              <InlineMathText text={sub.submittedAnswer} />
                            </span>
                            {sub.isCorrect ? (
                              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                            ) : (
                              <span className="text-[9px] text-emerald-600 shrink-0">→<InlineMathText text={sub.correctAnswer} /></span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">미제출</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <h4 className="text-[10px] font-bold text-text-secondary mb-1.5">정답 목록 ({shownBlanks.length})</h4>
                <div className="grid grid-cols-2 gap-1">
                  {shownBlanks.map((b) => {
                    const diff = b.difficulty || 'easy';
                    return (
                      <div key={b.position} className="flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-white">
                        <span className="shrink-0 w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-bold">
                          {b.position}
                        </span>
                        <span className="text-xs flex-1 truncate font-serif-kr">
                          <InlineMathText text={b.answer} />
                        </span>
                        <span className={`text-[9px] font-bold shrink-0 px-1 rounded ${DIFF_COLOR[diff]}`}>
                          {DIFF_LABEL[diff]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
