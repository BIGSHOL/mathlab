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
// 메인 페이지
// ══════════════════════════════════════

type AdminTabKey = 'references' | 'feedback';

const ADMIN_TABS = [
  { key: 'references' as const, label: '레퍼런스', icon: BookOpen },
  { key: 'feedback' as const, label: '피드백/학습', icon: MessageSquare },
];

export default function ExamAnalysisAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('references');

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

      {/* 상단 탭 */}
      <div className="mb-6">
        <Tabs
          items={ADMIN_TABS}
          activeKey={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'references' && <ReferenceTab />}
      {activeTab === 'feedback' && <FeedbackLearningTab />}
    </PageContainer>
  );
}
