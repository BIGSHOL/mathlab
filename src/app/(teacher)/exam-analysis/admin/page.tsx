'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import {
  ShieldAlert,
  BookOpen,
  MessageSquare,
  Brain,
  Check,
  X,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Users,
  Pencil,
  Save,
  Gauge,
} from 'lucide-react';
import { QUESTION_TYPE_LABELS } from '@/lib/exam-analysis/constants';

// ── 타입 ──

interface BankQuestion {
  id: string;
  content: string;
  choices: string[] | null;
  answer: string;
  type: string;
}

interface QuestionReference {
  id: string;
  questionNumber: number | string | null;
  topic: string | null;
  confidence: number | null;
  aiComment: string | null;
  difficulty: string;
  questionType: string | null;
  grade: string | null;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  createdAt: string;
  examPaperTitle: string | null;
  bankQuestion: BankQuestion | null;
}

interface ReferenceStats {
  pending: number;
  approved: number;
  rejected: number;
}

interface FeedbackItem {
  id: string;
  examPaperId: string | null;
  questionNumber: number | string;
  feedbackType: string;
  comment: string | null;
  status: string;
  createdAt: string;
}

interface LearnedPattern {
  id: string;
  subject: string;
  patternType: string;
  description: string;
  confidence: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  wrong_topic: '단원오류',
  wrong_difficulty: '난이도오류',
  wrong_recognition: '인식오류',
  other: '기타',
};

const FEEDBACK_TYPE_COLORS: Record<string, string> = {
  wrong_topic: 'bg-amber-100 text-amber-700',
  wrong_difficulty: 'bg-blue-100 text-blue-700',
  wrong_recognition: 'bg-red-100 text-red-700',
  other: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  resolved: '해결',
  dismissed: '무시',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  dismissed: 'bg-slate-100 text-slate-600',
};

// ── 신뢰도 뱃지 ──

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 85 ? 'bg-emerald-100 text-emerald-700' :
    pct >= 70 ? 'bg-blue-100 text-blue-700' :
    pct >= 50 ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-red-700';
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm ${color}`}>
      {pct}%
    </span>
  );
}

// ── 난이도 뱃지 ──

const DIFFICULTY_BG: Record<string, string> = {
  '1': 'bg-green-500', '2': 'bg-lime-500', '3': 'bg-amber-500', '4': 'bg-orange-500', '5': 'bg-red-500',
  concept: 'bg-green-500', pattern: 'bg-lime-500', reasoning: 'bg-orange-500', creative: 'bg-red-500',
};

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const bg = DIFFICULTY_BG[difficulty] || 'bg-slate-400';
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white rounded-sm ${bg}`}>
      Lv{difficulty}
    </span>
  );
}

// ══════════════════════════════════════
// 레퍼런스 탭
// ══════════════════════════════════════

function ReferenceTab() {
  const [stats, setStats] = useState<ReferenceStats>({ pending: 0, approved: 0, rejected: 0 });
  const [references, setReferences] = useState<QuestionReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNoteId, setRejectNoteId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch('/api/exam-analysis/question-references?mode=stats'),
        fetch('/api/exam-analysis/question-references?reviewStatus=pending&limit=50'),
      ]);
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        setStats(statsJson.data || { pending: 0, approved: 0, rejected: 0 });
      }
      if (listRes.ok) {
        const listJson = await listRes.json();
        setReferences(listJson.data || []);
      }
    } catch {
      toast.error('레퍼런스를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (refId: string) => {
    setActionLoading(refId);
    try {
      const res = await fetch(`/api/exam-analysis/question-references/${refId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: 'approved' }),
      });
      if (!res.ok) throw new Error();
      toast.success('승인되었습니다');
      fetchData();
    } catch {
      toast.error('승인에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (refId: string) => {
    if (!rejectNote.trim()) {
      toast.warning('거부 사유를 입력하세요');
      return;
    }
    setActionLoading(refId);
    try {
      const res = await fetch(`/api/exam-analysis/question-references/${refId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: 'rejected', reviewNote: rejectNote.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success('거부되었습니다');
      setRejectNoteId(null);
      setRejectNote('');
      fetchData();
    } catch {
      toast.error('거부에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-slate-200 rounded-sm bg-white p-4">
          <p className="text-xs text-slate-500 mb-1">대기</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="border border-slate-200 rounded-sm bg-white p-4">
          <p className="text-xs text-slate-500 mb-1">승인</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
        </div>
        <div className="border border-slate-200 rounded-sm bg-white p-4">
          <p className="text-xs text-slate-500 mb-1">거부</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
      </div>

      {/* 대기 중 레퍼런스 목록 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">대기 중 레퍼런스 ({references.length}건)</h3>
          <Button size="sm" variant="ghost" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            새로고침
          </Button>
        </div>

        {references.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
            <BookOpen className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-sm">대기 중인 레퍼런스가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {references.map((ref) => (
              <div
                key={ref.id}
                className="border border-slate-200 rounded-sm bg-white p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {ref.questionNumber != null && (
                        <span className="text-sm font-bold text-text-primary">
                          {ref.questionNumber}번
                        </span>
                      )}
                      {ref.confidence != null && <ConfidenceBadge confidence={ref.confidence} />}
                      <DifficultyBadge difficulty={ref.difficulty} />
                      {ref.questionType && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {QUESTION_TYPE_LABELS[ref.questionType] ?? ref.questionType}
                        </span>
                      )}
                    </div>

                    {ref.examPaperTitle && (
                      <p className="text-xs text-primary font-medium mb-1">
                        {ref.examPaperTitle}
                        {ref.grade && <span className="text-slate-400 ml-1">· {ref.grade}</span>}
                      </p>
                    )}

                    {ref.topic && (
                      <p className="text-xs text-slate-600 mb-1">{ref.topic}</p>
                    )}

                    {ref.aiComment && (
                      <p className="text-xs text-slate-500 leading-relaxed">{ref.aiComment}</p>
                    )}

                    {ref.bankQuestion && (
                      <div className="mt-2 p-2.5 bg-blue-50/50 border border-blue-100 rounded-sm">
                        <p className="text-[10px] text-blue-600 font-medium mb-1">문제은행 원문</p>
                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                          {ref.bankQuestion.content.replace(/\$[^$]*\$/g, '□').replace(/[#*]/g, '').slice(0, 200)}
                        </p>
                        {ref.bankQuestion.answer && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            정답: <span className="font-medium text-slate-700">{ref.bankQuestion.answer.slice(0, 50)}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {new Date(ref.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {rejectNoteId === ref.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="거부 사유"
                          className="w-40 px-2 py-1 text-xs border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleReject(ref.id);
                            if (e.key === 'Escape') { setRejectNoteId(null); setRejectNote(''); }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleReject(ref.id)}
                          loading={actionLoading === ref.id}
                          className="!h-7 !px-2 !text-xs"
                        >
                          확인
                        </Button>
                        <button
                          onClick={() => { setRejectNoteId(null); setRejectNote(''); }}
                          className="p-1 rounded-sm hover:bg-slate-100 text-slate-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(ref.id)}
                          loading={actionLoading === ref.id}
                          className="!h-7 !px-2.5 !text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setRejectNoteId(ref.id); setRejectNote(''); }}
                          className="!h-7 !px-2.5 !text-xs text-red-500 hover:text-red-600"
                        >
                          <X className="w-3 h-3 mr-1" />
                          거부
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// 피드백/학습 탭
// ══════════════════════════════════════

function FeedbackLearningTab() {
  // 피드백
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  // 학습 패턴
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const res = await fetch('/api/exam-analysis/feedback');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setFeedbacks(json.data || []);
    } catch {
      toast.error('피드백을 불러오지 못했습니다');
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  const fetchPatterns = useCallback(async () => {
    setPatternsLoading(true);
    try {
      const res = await fetch('/api/exam-analysis/learned-patterns?subject=MATH');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPatterns(json.data || []);
    } catch {
      toast.error('학습 패턴을 불러오지 못했습니다');
    } finally {
      setPatternsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
    fetchPatterns();
  }, [fetchFeedbacks, fetchPatterns]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/exam-analysis/learned-patterns?action=analyze', {
        method: 'POST',
      });
      if (!res.ok) throw new Error();
      toast.success('패턴 학습이 완료되었습니다');
      fetchPatterns();
    } catch {
      toast.error('패턴 학습에 실패했습니다');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggle = async (pattern: LearnedPattern) => {
    setTogglingId(pattern.id);
    try {
      const res = await fetch(`/api/exam-analysis/learned-patterns/${pattern.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pattern.isActive }),
      });
      if (!res.ok) throw new Error();
      setPatterns((prev) =>
        prev.map((p) => (p.id === pattern.id ? { ...p, isActive: !p.isActive } : p)),
      );
    } catch {
      toast.error('변경에 실패했습니다');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* 피드백 목록 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-primary" />
            피드백 목록
          </h3>
          <Button size="sm" variant="ghost" onClick={fetchFeedbacks}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            새로고침
          </Button>
        </div>

        {feedbackLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="border border-slate-200 rounded-sm bg-white py-8 text-center text-sm text-slate-400">
            접수된 피드백이 없습니다
          </div>
        ) : (
          <div className="border border-slate-200 rounded-sm bg-white overflow-hidden">
            <div className="grid grid-cols-[80px_90px_80px_1fr_100px] bg-slate-50 px-3 py-2 border-b text-xs font-medium text-slate-500">
              <span>문항</span>
              <span>유형</span>
              <span>상태</span>
              <span>코멘트</span>
              <span className="text-right">일시</span>
            </div>
            <div className="divide-y divide-slate-100">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="grid grid-cols-[80px_90px_80px_1fr_100px] px-3 py-2.5 text-xs items-center hover:bg-slate-50">
                  <span className="font-bold text-slate-800">{fb.questionNumber}번</span>
                  <span>
                    <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${FEEDBACK_TYPE_COLORS[fb.feedbackType] || 'bg-slate-100 text-slate-600'}`}>
                      {FEEDBACK_TYPE_LABELS[fb.feedbackType] || fb.feedbackType}
                    </span>
                  </span>
                  <span>
                    <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${STATUS_COLORS[fb.status] || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABELS[fb.status] || fb.status}
                    </span>
                  </span>
                  <span className="text-slate-600 truncate">{fb.comment || '-'}</span>
                  <span className="text-slate-400 text-right">{new Date(fb.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 학습 패턴 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-primary" />
            학습 패턴 ({patterns.length}개)
          </h3>
          <Button size="sm" onClick={handleAnalyze} loading={analyzing}>
            <Brain className="w-3.5 h-3.5 mr-1" />
            패턴 학습 실행
          </Button>
        </div>

        {patternsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : patterns.length === 0 ? (
          <div className="border border-slate-200 rounded-sm bg-white py-8 text-center text-sm text-slate-400">
            학습된 패턴이 없습니다. &quot;패턴 학습 실행&quot;을 클릭하세요.
          </div>
        ) : (
          <div className="space-y-3">
            {patterns.map((p) => (
              <div
                key={p.id}
                className={`border rounded-sm bg-white p-4 transition-colors ${
                  p.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-100 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-text-primary">{p.patternType}</span>
                      <ConfidenceBadge confidence={p.confidence} />
                      {!p.isActive && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-sm bg-slate-100 text-slate-500">비활성</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {new Date(p.updatedAt).toLocaleDateString('ko-KR')} 업데이트
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle(p)}
                    disabled={togglingId === p.id}
                    className="p-1 rounded-sm hover:bg-slate-100 transition-colors shrink-0"
                    title={p.isActive ? '비활성화' : '활성화'}
                  >
                    {p.isActive ? (
                      <ToggleRight className="w-6 h-6 text-primary" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// 강사 탭 — 명단 + 인라인 이름 편집 + 사용 현황 통계
// ══════════════════════════════════════

interface TeacherUsageRow {
  id: string;
  username: string;
  name: string;
  createdAt: string;
  stats: {
    analyzeCount: number;
    commentaryCount: number;
    articleCount: number;
    otherCount: number;
    totalActions: number;
    lastActivity: string | null;
  };
}

type ActivityType = 'analyze' | 'commentary' | 'article' | 'copy';

interface ActivityEvent {
  type: ActivityType;
  timestamp: string;
  examPaper: { id: string; title: string; schoolName: string | null } | null;
}

const ACTIVITY_LABELS: Record<ActivityType, { label: string; color: string }> = {
  analyze: { label: '분석', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  commentary: { label: '총평', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  article: { label: '글 작성', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  copy: { label: '복사', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

function formatRelative(iso: string | null): string {
  if (!iso) return '활동 없음';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}일 전`;
  return date.toISOString().slice(0, 10);
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yy}.${mm}.${dd} ${hh}:${min}`;
}

// ── 강사 활동 로그 모달 ──
function TeacherActivityLogModal({
  teacher,
  onClose,
}: {
  teacher: { id: string; name: string; username: string };
  onClose: () => void;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/exam-analysis/teacher-usage/${teacher.id}/log`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((j) => { if (!cancelled) setEvents(j.data?.events || []); })
      .catch(() => { if (!cancelled) toast.error('활동 로그를 불러오지 못했습니다'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teacher.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-sm w-full max-w-3xl max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text-primary">{teacher.name} 활동 로그</h3>
            <p className="text-xs text-slate-500 font-mono">{teacher.username}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
              <p className="text-sm">활동 기록이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1">
              {events.map((e, i) => {
                const meta = ACTIVITY_LABELS[e.type];
                return (
                  <div
                    key={`${e.type}-${e.timestamp}-${i}`}
                    className="flex items-center gap-2 py-2 px-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                  >
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm border shrink-0 w-14 justify-center ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-500 font-mono shrink-0">
                      {formatTimestamp(e.timestamp)}
                    </span>
                    <span className="text-sm text-slate-700 font-medium shrink-0 max-w-[140px] truncate">
                      {e.examPaper?.schoolName ?? '학교 미상'}
                    </span>
                    <span className="text-sm text-slate-500 truncate flex-1" title={e.examPaper?.title ?? ''}>
                      {e.examPaper?.title ?? '(시험지 정보 없음)'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-200 text-xs text-slate-400 flex items-center justify-between">
          <span>총 {events.length}건 (최대 500건)</span>
          <span>분석 · 총평 · 글 작성 · 복사 통합</span>
        </div>
      </div>
    </div>
  );
}

function TeachersTab() {
  const [rows, setRows] = useState<TeacherUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<{ id: string; name: string; username: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/exam-analysis/teacher-usage');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRows(json.data || []);
    } catch {
      toast.error('강사 명단을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startEdit = (row: TeacherUsageRow) => {
    setEditingId(row.id);
    setEditName(row.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.warning('이름을 입력하세요');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || '저장 실패');
      }
      toast.success('이름이 저장되었습니다');
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name: trimmed } : r)));
      cancelEdit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
        <Users className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm">등록된 강사가 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          침산점 강사 {rows.length}명 · 분석/총평/글 작성 누적 통계
        </p>
        <Button size="sm" variant="ghost" onClick={fetchData} title="새로고침">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">아이디</th>
              <th className="px-3 py-2 text-left font-medium w-56">이름 (분석자 표시)</th>
              <th className="px-3 py-2 text-center font-medium">분석</th>
              <th className="px-3 py-2 text-center font-medium">총평</th>
              <th className="px-3 py-2 text-center font-medium">블로그 글</th>
              <th className="px-3 py-2 text-center font-medium">총 작업</th>
              <th className="px-3 py-2 text-left font-medium">최근 활동</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer"
                onClick={() => {
                  if (editingId === row.id) return; // 편집 중일 때는 모달 안 열기
                  setSelectedTeacher({ id: row.id, name: row.name, username: row.username });
                }}
                title="클릭하여 활동 로그 보기"
              >
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{row.username}</td>
                <td className="px-3 py-2 w-56" onClick={(e) => e.stopPropagation()}>
                  {editingId === row.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(row.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        disabled={saving}
                        className="border border-primary rounded-sm px-2 py-1 text-sm w-32 focus:outline-none"
                      />
                      <Button size="sm" variant="primary" onClick={() => saveEdit(row.id)} disabled={saving}>
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span className="font-medium">{row.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(row); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-opacity"
                        title="이름 수정"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={row.stats.analyzeCount > 0 ? 'font-semibold text-blue-600' : 'text-slate-400'}>
                    {row.stats.analyzeCount}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={row.stats.commentaryCount > 0 ? 'font-semibold text-purple-600' : 'text-slate-400'}>
                    {row.stats.commentaryCount}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={row.stats.articleCount > 0 ? 'font-semibold text-emerald-600' : 'text-slate-400'}>
                    {row.stats.articleCount}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-bold text-slate-700">
                  {row.stats.totalActions}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {formatRelative(row.stats.lastActivity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        강사 행을 클릭하면 시간순 활동 로그를 볼 수 있고, 이름 펜 아이콘으로 분석자 표시 이름을 바꿀 수 있습니다.
      </p>

      {selectedTeacher && (
        <TeacherActivityLogModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════
// 메인 페이지
// ══════════════════════════════════════

type AdminTabKey = 'references' | 'feedback' | 'teachers' | 'calibration';

const ADMIN_TABS = [
  { key: 'references' as const, label: '레퍼런스', icon: BookOpen },
  { key: 'feedback' as const, label: '피드백/학습', icon: MessageSquare },
  { key: 'calibration' as const, label: '난이도 보정', icon: Gauge },
  { key: 'teachers' as const, label: '강사', icon: Users },
];

export default function ExamAnalysisAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  // injaewon 관리자: 강사 탭만 노출, 기본 활성 탭도 강사
  const isTeacherAdminOnly = user?.username === 'injaewon';
  // 난이도 보정 탭은 SUPER_ADMIN 전용 (플랫폼 전역 보정 데이터)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const visibleTabs = isTeacherAdminOnly
    ? ADMIN_TABS.filter((t) => t.key === 'teachers')
    : ADMIN_TABS.filter((t) => t.key !== 'calibration' || isSuperAdmin);
  const [activeTab, setActiveTab] = useState<AdminTabKey>('references');
  // activeTab이 visibleTabs에 없으면 강제 보정 (useState 초기값은 user 로드 전 평가되므로)
  const effectiveTab: AdminTabKey =
    visibleTabs.some((t) => t.key === activeTab) ? activeTab : (visibleTabs[0]?.key ?? 'references');

  // ── 권한 체크 ──

  if (authLoading) {
    return (
      <PageContainer maxWidth="xl">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!user || !hasRoleClient(user.role, 'OWNER')) {
    return (
      <PageContainer maxWidth="xl">
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <ShieldAlert className="w-12 h-12 mb-4 text-red-400" />
          <p className="text-lg font-semibold text-text-primary">권한이 없습니다</p>
          <p className="text-sm mt-1">원장 이상 권한이 필요합니다.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="기출 분석 관리"
        subtitle="레퍼런스, 피드백 및 학습 패턴 관리"
        icon={<BookOpen className="w-6 h-6" />}
        backHref="/exam-analysis"
      />

      {/* 상단 탭 (injaewon은 강사 탭만) */}
      {visibleTabs.length > 1 && (
        <div className="mb-6">
          <Tabs
            items={visibleTabs}
            activeKey={effectiveTab}
            onChange={setActiveTab}
            variant="underline"
          />
        </div>
      )}

      {/* 탭 콘텐츠 */}
      {effectiveTab === 'references' && <ReferenceTab />}
      {effectiveTab === 'feedback' && <FeedbackLearningTab />}
      {effectiveTab === 'calibration' && <CalibrationTab />}
      {effectiveTab === 'teachers' && <TeachersTab />}
    </PageContainer>
  );
}

// ── 난이도 보정 탭 (SUPER_ADMIN) ──

interface CalibrationStatsData {
  totalCorrections: number;
  totalAnalyzedQuestions: number;
  correctionRate: number;
  globalBias: number;
  perAiLevel: Record<string, { count: number; meanDelta: number }>;
  byQuestionType: Record<string, { count: number; meanDelta: number }>;
  buckets: { key: string; questionType: string; aiLevel: number; sampleCount: number; meanDelta: number; consistent: boolean; applied: boolean }[];
}

const QTYPE_KO: Record<string, string> = {
  number: '수와 연산', algebra: '문자와 식', function: '함수',
  geometry: '기하', statistics: '확률과 통계', unknown: '미분류',
};

function biasLabel(bias: number): { text: string; color: string } {
  if (bias >= 0.5) return { text: 'AI가 너무 낮게 평가', color: 'text-red-600' };
  if (bias >= 0.15) return { text: 'AI가 다소 낮게 평가', color: 'text-amber-600' };
  if (bias <= -0.5) return { text: 'AI가 너무 높게 평가', color: 'text-red-600' };
  if (bias <= -0.15) return { text: 'AI가 다소 높게 평가', color: 'text-amber-600' };
  return { text: '체감과 거의 일치', color: 'text-emerald-600' };
}

function CalibrationTab() {
  const [stats, setStats] = useState<CalibrationStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/exam-analysis/calibration/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error('통계 조회 실패');
      const json = await res.json();
      setStats(json.data);
    } catch {
      toast.error('보정 통계를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const recompute = async () => {
    setRecomputing(true);
    try {
      const res = await fetch('/api/exam-analysis/calibration/recompute', { method: 'POST' });
      if (!res.ok) throw new Error('재계산 실패');
      const json = await res.json();
      toast.success(`편향 측정 갱신 완료 (버킷 ${json.data.appliedBuckets}개)`);
      await load();
    } catch {
      toast.error('편향 측정 갱신에 실패했습니다');
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) return <Skeleton className="h-[400px] w-full" />;
  if (!stats) return <div className="text-center py-12 text-sm text-slate-400">데이터가 없습니다.</div>;

  const bl = biasLabel(stats.globalBias);

  return (
    <div className="space-y-5">
      {/* 안내 + 재계산 */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          선생님 교정은 <strong className="text-slate-700">해당 시험 분석에 즉시 반영</strong>됩니다.
          누적 교정은 AI 난이도 품질을 <strong className="text-slate-700">측정하는 벤치마크</strong>로만 쓰이며, 새 분석에 자동 반영되지 않습니다.
        </p>
        <Button size="sm" onClick={recompute} disabled={recomputing}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${recomputing ? 'animate-spin' : ''}`} />
          편향 측정 갱신
        </Button>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-sm p-4">
          <div className="text-xs text-slate-500 mb-1">전역 편향</div>
          <div className="text-2xl font-black">{stats.globalBias >= 0 ? '+' : ''}{stats.globalBias.toFixed(2)}</div>
          <div className={`text-xs font-medium mt-0.5 ${bl.color}`}>{bl.text}</div>
        </div>
        <div className="border rounded-sm p-4">
          <div className="text-xs text-slate-500 mb-1">교정 표본</div>
          <div className="text-2xl font-black">{stats.totalCorrections.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">교정 비율 {(stats.correctionRate * 100).toFixed(1)}%</div>
        </div>
        <div className="border rounded-sm p-4">
          <div className="text-xs text-slate-500 mb-1">분석 문항</div>
          <div className="text-2xl font-black">{stats.totalAnalyzedQuestions.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">누적 분석 기준</div>
        </div>
      </div>

      {/* 버킷별 보정 */}
      <div>
        <h3 className="text-sm font-bold mb-2">유형 × AI난이도 버킷별 편향(측정)</h3>
        {stats.buckets.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 border rounded-sm">
            아직 교정 데이터가 없습니다. 분석본의 문항 난이도를 교정하면 측정이 시작됩니다.
          </div>
        ) : (
          <div className="border rounded-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_70px_70px_90px_70px] bg-slate-50 px-3 py-2 border-b text-xs font-medium text-slate-500">
              <span>버킷 (유형 · AI난이도)</span>
              <span className="text-center">표본</span>
              <span className="text-center">평균 Δ</span>
              <span className="text-center">방향일관</span>
              <span className="text-center">적용</span>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.buckets.map((b) => (
                <div key={b.key} className="grid grid-cols-[1fr_70px_70px_90px_70px] px-3 py-2 text-xs items-center">
                  <span className="text-slate-700">{QTYPE_KO[b.questionType] || b.questionType} · {b.aiLevel}</span>
                  <span className="text-center">{b.sampleCount}</span>
                  <span className={`text-center font-bold ${b.meanDelta > 0 ? 'text-red-500' : b.meanDelta < 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                    {b.meanDelta >= 0 ? '+' : ''}{b.meanDelta.toFixed(1)}
                  </span>
                  <span className="text-center">{b.consistent ? '✓' : '–'}</span>
                  <span className="text-center">
                    {b.applied
                      ? <span className="px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-700 font-medium">적용</span>
                      : <span className="text-slate-400">대기</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-1.5">
          표본 5건 이상 + 방향 일관성 70% 이상 + |평균 Δ| ≥ 0.5 인 버킷만 자동 적용됩니다(과보정 방지).
        </p>
      </div>
    </div>
  );
}
