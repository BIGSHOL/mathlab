'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/Toast';
import {
  UserPlus,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Download,
  Search,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Calendar,
  Star,
  Shield,
  Flame,
  Clock,
  ClipboardCheck,
  Calculator,
  BookOpen,
  Zap,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  CalendarCheck,
  GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';

// ── Types ──

interface UserItem {
  id: string;
  seq: number;
  username: string;
  name: string;
  role: string;
  grade: number | null;
  createdAt: string;
  profile: {
    totalXp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveAt: string | null;
  } | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type StudentStats = {
  type: 'student';
  profile: any;
  summary: {
    testCount: number;
    testAvgScore: number;
    arithmeticCount: number;
    arithmeticCorrect: number;
    arithmeticTotal: number;
    arithmeticTime: number;
    learningTotal: number;
    learningCompleted: number;
    homeworkEnrollments: number;
  };
  recentTests: any[];
  recentArithmetic: any[];
  recentLearning: any[];
  recentAssignments: any[];
  recentPoints: any[];
};

type TeacherStats = {
  type: 'teacher';
  summary: {
    testsCreated: number;
    homeworkPlans: number;
    commentsWritten: number;
    questionsGenerated: number;
  };
  recentTests: any[];
  recentHomework: any[];
  recentComments: any[];
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Helpers ──

function gradeLabel(grade: number | null): string {
  if (!grade) return '-';
  return grade <= 6 ? `초등 ${grade}학년` : `중등 ${grade - 6}학년`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '없음';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}초`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
}

const STAGE_LABELS: Record<string, string> = {
  READING: '읽기',
  BLANK_EASY: '빈칸(쉬움)',
  BLANK_HARD: '빈칸(어려움)',
  BLANK_FULL: '빈칸(전체)',
  BLANK_PAGE: '백지쓰기',
};

interface ArithmeticAnswerItem {
  problemIndex: number;
  content: string;
  choices: string[];
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  comboCount: number;
  pointsEarned: number;
}

// ── Sub-components ──

function InfoBox({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon?: typeof Star }) {
  return (
    <div className="bg-slate-50 rounded-sm p-2.5">
      <div className="flex items-center gap-1 text-[10px] text-text-secondary mb-0.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-sm font-semibold text-text-primary">{value}</div>
      {sub && <div className="text-[10px] text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Star; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 mt-4">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <h3 className="text-xs font-bold text-text-primary">{title}</h3>
    </div>
  );
}

function StudentDetail({ user, stats, statsLoading, showTeachers, isAdmin, onResetPassword, onDelete }: {
  user: UserItem;
  stats: StudentStats | null;
  statsLoading: boolean;
  showTeachers: boolean;
  isAdmin: boolean;
  onResetPassword: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const s = stats?.summary;
  const accuracyPct = s && s.arithmeticTotal > 0
    ? Math.round((s.arithmeticCorrect / s.arithmeticTotal) * 100) : 0;

  // 연산 연습 상세 확장
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<ArithmeticAnswerItem[]>([]);
  const [attemptDetailLoading, setAttemptDetailLoading] = useState(false);

  // 연산 숙제 오답
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [hwWrongData, setHwWrongData] = useState<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const [hwWrongLoading, setHwWrongLoading] = useState(false);
  const [hwWrongExpanded, setHwWrongExpanded] = useState<string | null>(null);
  const [hwWrongPeriod, setHwWrongPeriod] = useState<string>('all');

  // 개념 네비 모드
  const [navMode, setNavMode] = useState<string>('curriculum');
  const [navChains, setNavChains] = useState<string[]>([]);
  const [navSaving, setNavSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${user.id}/concept-nav`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setNavMode(json.data.mode);
          setNavChains(json.data.availableChains ?? []);
        }
      })
      .catch(() => {});
  }, [user.id]);

  const saveNavMode = async (mode: string) => {
    setNavMode(mode);
    setNavSaving(true);
    try {
      await fetch(`/api/users/${user.id}/concept-nav`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
    } catch { /* ignore */ }
    setNavSaving(false);
  };

  useEffect(() => {
    if (!stats) return;
    setHwWrongData(null);
    setHwWrongExpanded(null);
    setHwWrongLoading(true);
    fetch(`/api/arithmetic/homework-wrong-answers?studentId=${user.id}&period=${hwWrongPeriod}`)
      .then((r) => r.json())
      .then((json) => setHwWrongData(json.data ?? null))
      .catch(() => {})
      .finally(() => setHwWrongLoading(false));
  }, [stats, user.id, hwWrongPeriod]);

  const toggleAttemptDetail = async (attemptId: string) => {
    if (expandedAttemptId === attemptId) {
      setExpandedAttemptId(null);
      setAttemptAnswers([]);
      return;
    }
    setExpandedAttemptId(attemptId);
    setAttemptDetailLoading(true);
    try {
      const res = await fetch(`/api/arithmetic/attempts/${attemptId}`);
      if (res.ok) {
        const json = await res.json();
        setAttemptAnswers(json.data?.answers ?? []);
      }
    } catch { /* ignore */ }
    setAttemptDetailLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-primary">{user.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-text-primary">{user.name}</h2>
          <p className="text-xs text-text-secondary">@{user.username}</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
        <InfoBox label="학년" value={gradeLabel(user.grade)} />
        <InfoBox label="레벨" value={`Lv.${user.profile?.level ?? 1}`} icon={Star} />
        <InfoBox label="총 XP" value={`${(user.profile?.totalXp ?? 0).toLocaleString()}`} icon={Zap} />
        <InfoBox label="연속 학습" value={`${user.profile?.currentStreak ?? 0}일`} sub={`최장 ${user.profile?.longestStreak ?? 0}일`} icon={Flame} />
        <InfoBox label="최근 활동" value={relativeTime(user.profile?.lastActiveAt ?? null)} icon={Clock} />
        <InfoBox label="가입일" value={new Date(user.createdAt).toLocaleDateString('ko-KR')} icon={Calendar} />
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-8 text-text-secondary text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> 상세 정보 불러오는 중...
        </div>
      ) : s && (
        <>
          {/* 학습 요약 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1">
            <div className="bg-blue-50 rounded-sm p-2.5">
              <div className="text-[10px] text-blue-600 font-medium">시험 응시</div>
              <div className="text-sm font-bold text-blue-700">{s.testCount}회</div>
              <div className="text-[10px] text-blue-500">평균 {s.testAvgScore}점</div>
            </div>
            <div className="bg-amber-50 rounded-sm p-2.5">
              <div className="text-[10px] text-amber-600 font-medium">연산 연습</div>
              <div className="text-sm font-bold text-amber-700">{s.arithmeticCount}회</div>
              <div className="text-[10px] text-amber-500">정답률 {accuracyPct}%</div>
            </div>
            <div className="bg-emerald-50 rounded-sm p-2.5">
              <div className="text-[10px] text-emerald-600 font-medium">개념 학습</div>
              <div className="text-sm font-bold text-emerald-700">{s.learningCompleted}/{s.learningTotal}</div>
              <div className="text-[10px] text-emerald-500">완료/전체</div>
            </div>
            <div className="bg-violet-50 rounded-sm p-2.5">
              <div className="text-[10px] text-violet-600 font-medium">연산 숙제</div>
              <div className="text-sm font-bold text-violet-700">{s.homeworkEnrollments}개</div>
              <div className="text-[10px] text-violet-500">참여 플랜</div>
            </div>
          </div>

          {/* 개념 학습 순서 설정 */}
          <SectionTitle icon={GitBranch} title="개념 학습 순서" />
          <div className="bg-white border border-slate-100 rounded-sm p-3 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => saveNavMode('curriculum')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  navMode === 'curriculum'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
                disabled={navSaving}
              >
                교육과정 순서
              </button>
              <select
                value={navMode.startsWith('chain:') ? navMode : ''}
                onChange={(e) => { if (e.target.value) saveNavMode(e.target.value); }}
                className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                  navMode.startsWith('chain:')
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-slate-200 bg-white text-text-secondary'
                }`}
                disabled={navSaving}
              >
                <option value="">계통수학 선택...</option>
                {navChains.map((chain) => (
                  <option key={chain} value={`chain:${chain}`}>{chain}</option>
                ))}
              </select>
              {navSaving && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </div>
            <p className="text-[10px] text-text-secondary mt-1.5">
              {navMode === 'curriculum'
                ? '같은 학년 내 교육과정 순서로 이전/다음 개념 이동'
                : `${navMode.substring(6)} 순서로 학년을 넘나들며 이전/다음 개념 이동`}
            </p>
          </div>

          {/* 최근 시험 */}
          {stats!.recentTests.length > 0 && (
            <>
              <SectionTitle icon={ClipboardCheck} title="최근 시험" />
              <div className="space-y-1.5">
                {stats!.recentTests.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-sm px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{t.test.title}</div>
                      <div className="text-[10px] text-text-secondary">{relativeTime(t.completedAt ?? t.startedAt)}</div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {t.completedAt ? (
                        <>
                          <div className="text-xs font-bold text-text-primary">{t.score}/{t.maxScore}점</div>
                          <div className="text-[10px] text-text-secondary">{t.correctCount}/{t.totalCount}문제</div>
                        </>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-medium">진행 중</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 최근 연산 연습 */}
          {stats!.recentArithmetic.length > 0 && (
            <>
              <SectionTitle icon={Calculator} title="최근 연산 연습" />
              <div className="space-y-1.5">
                {stats!.recentArithmetic.map((a: any) => {
                  const isExpanded = expandedAttemptId === a.id;
                  const wrongAnswers = attemptAnswers.filter((ans) => !ans.isCorrect);
                  return (
                    <div key={a.id} className="bg-white border border-slate-100 rounded-sm overflow-hidden">
                      <button
                        onClick={() => toggleAttemptDetail(a.id)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 text-left">
                          <div className="text-xs font-medium text-text-primary">{CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS] ?? a.category}</div>
                          <div className="text-[10px] text-text-secondary">{relativeTime(a.completedAt ?? a.createdAt)}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="text-right">
                            <div className="text-xs font-bold text-text-primary">{a.correctCount}/{a.problemCount}</div>
                            <div className="text-[10px] text-text-secondary">{formatSeconds(a.totalTimeSeconds)}</div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50">
                          {attemptDetailLoading ? (
                            <div className="flex items-center justify-center py-4 text-text-secondary text-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> 불러오는 중...
                            </div>
                          ) : attemptAnswers.length === 0 ? (
                            <div className="text-center py-4 text-xs text-text-secondary">답안 데이터가 없습니다</div>
                          ) : (
                            <div className="px-3 py-2.5">
                              {/* 요약 바 */}
                              <div className="flex items-center gap-3 mb-2 text-[10px]">
                                <span className="text-emerald-600 font-medium">정답 {attemptAnswers.filter((ans) => ans.isCorrect).length}개</span>
                                <span className="text-red-500 font-medium">오답 {wrongAnswers.length}개</span>
                                <span className="text-text-secondary">
                                  평균 {Math.round(attemptAnswers.reduce((s, ans) => s + ans.timeSpentSeconds, 0) / attemptAnswers.length)}초/문제
                                </span>
                              </div>

                              {/* 틀린 문제 표시 */}
                              {wrongAnswers.length > 0 && (
                                <div className="space-y-1.5 mb-2">
                                  <div className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                    <X className="w-3 h-3" /> 틀린 문제
                                  </div>
                                  {wrongAnswers.map((ans) => (
                                    <div key={ans.problemIndex} className="bg-white rounded-sm border border-red-100 px-2.5 py-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs text-text-primary font-medium mb-1 [&_p]:inline [&_p]:m-0">
                                            #{ans.problemIndex + 1}. <MathRenderer content={ans.content} />
                                          </div>
                                          <div className="flex items-center gap-3 text-[10px]">
                                            <span className="text-red-500 [&_p]:inline [&_p]:m-0">
                                              학생: <span className="font-semibold"><MathRenderer content={ans.selectedAnswer} /></span>
                                            </span>
                                            <span className="text-emerald-600 [&_p]:inline [&_p]:m-0">
                                              정답: <span className="font-semibold"><MathRenderer content={ans.correctAnswer} /></span>
                                            </span>
                                          </div>
                                        </div>
                                        <span className="text-[10px] text-text-secondary shrink-0">{ans.timeSpentSeconds}초</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 전체 문제 그리드 */}
                              <div className="text-[10px] font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                                <Check className="w-3 h-3" /> 전체 정오표
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {attemptAnswers.map((ans) => (
                                  <div
                                    key={ans.problemIndex}
                                    className={`w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                                      ans.isCorrect
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-600'
                                    }`}
                                    title={`#${ans.problemIndex + 1}: ${ans.content} → ${ans.selectedAnswer} (정답: ${ans.correctAnswer}) ${ans.timeSpentSeconds}초`}
                                  >
                                    {ans.problemIndex + 1}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* 최근 개념 학습 */}
          {stats!.recentLearning.length > 0 && (
            <>
              <SectionTitle icon={BookOpen} title="최근 개념 학습" />
              <div className="space-y-1.5">
                {stats!.recentLearning.map((lp: any) => (
                  <div key={lp.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-sm px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{lp.concept.title}</div>
                      <div className="text-[10px] text-text-secondary">
                        {STAGE_LABELS[lp.stage] ?? lp.stage} · {relativeTime(lp.completedAt ?? lp.startedAt)}
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      lp.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-text-secondary'
                    }`}>
                      {lp.completed ? '완료' : '진행 중'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 시험 배정 현황 */}
          {stats!.recentAssignments.length > 0 && (
            <>
              <SectionTitle icon={FileText} title="시험 배정 현황" />
              <div className="space-y-1.5">
                {stats!.recentAssignments.map((a: any, i: number) => {
                  const statusColor: Record<string, string> = {
                    ASSIGNED: 'bg-blue-100 text-blue-700',
                    IN_PROGRESS: 'bg-amber-100 text-amber-700',
                    COMPLETED: 'bg-emerald-100 text-emerald-700',
                    OVERDUE: 'bg-red-100 text-red-700',
                  };
                  const statusLabel: Record<string, string> = {
                    ASSIGNED: '배정됨', IN_PROGRESS: '진행 중', COMPLETED: '완료', OVERDUE: '기한 초과',
                  };
                  return (
                    <div key={i} className="flex items-center justify-between bg-white border border-slate-100 rounded-sm px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">{a.test.title}</div>
                        {a.dueDate && <div className="text-[10px] text-text-secondary">마감: {new Date(a.dueDate).toLocaleDateString('ko-KR')}</div>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {a.bestScore != null && <span className="text-xs font-bold text-text-primary">{a.bestScore}점</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColor[a.status] ?? 'bg-slate-100 text-text-secondary'}`}>
                          {statusLabel[a.status] ?? a.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* XP 내역 */}
          {stats!.recentPoints.length > 0 && (
            <>
              <SectionTitle icon={Zap} title="최근 XP 내역" />
              <div className="space-y-1">
                {stats!.recentPoints.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5">
                    <div className="text-xs text-text-secondary">{p.reason}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${p.type === 'EARN' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {p.type === 'EARN' ? '+' : '-'}{p.amount}
                      </span>
                      <span className="text-[10px] text-text-secondary">{relativeTime(p.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* 연산 숙제 오답 */}
      {!showTeachers && (hwWrongData || hwWrongLoading) && (
        <>
          <div className="flex items-center justify-between mt-3 mb-2">
            <SectionTitle icon={CalendarCheck} title={`연산 숙제 오답${hwWrongData ? ` (${hwWrongData.totalWrong}문제)` : ''}`} />
            <select
              value={hwWrongPeriod}
              onChange={(e) => setHwWrongPeriod(e.target.value)}
              className="text-[10px] border border-slate-200 rounded-sm px-1.5 py-0.5 bg-white text-text-secondary"
            >
              <option value="7d">최근 7일</option>
              <option value="30d">최근 30일</option>
              <option value="90d">최근 90일</option>
              <option value="all">전체 기간</option>
            </select>
          </div>

          {hwWrongLoading && (
            <div className="flex items-center justify-center py-3 text-text-secondary text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> 숙제 오답 확인 중...
            </div>
          )}

          {hwWrongData && hwWrongData.totalWrong === 0 && !hwWrongLoading && (
            <div className="text-center py-3 text-text-secondary text-xs">
              해당 기간에 오답이 없습니다
            </div>
          )}

          {/* 카테고리별 취약점 */}
          {hwWrongData && hwWrongData.totalWrong > 0 && (
            <>
              {hwWrongData.categorySummary.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {hwWrongData.categorySummary.map((cat: any) => (
                    <div
                      key={cat.category}
                      className={`px-2 py-1 rounded-sm text-[10px] font-medium ${
                        cat.accuracy < 70 ? 'bg-red-50 text-red-600 border border-red-200' :
                        cat.accuracy < 85 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-slate-50 text-text-secondary border border-slate-200'
                      }`}
                    >
                      {cat.categoryLabel} <span className="font-bold">{cat.wrongCount}문제</span> ({cat.accuracy}%)
                    </div>
                  ))}
                </div>
              )}

              {/* 시도별 오답 목록 */}
              <div className="space-y-1.5">
                {hwWrongData.attempts.map((att: any) => {
                  const isExp = hwWrongExpanded === att.id;
                  return (
                    <div key={att.id} className="bg-white border border-slate-100 rounded-sm overflow-hidden">
                      <button
                        onClick={() => setHwWrongExpanded(isExp ? null : att.id)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 text-left">
                          <div className="text-xs font-medium text-text-primary">
                            {att.categoryLabel}
                            {att.planTitle && <span className="text-[10px] text-text-secondary ml-1.5">· {att.planTitle}</span>}
                          </div>
                          <div className="text-[10px] text-text-secondary">
                            {att.homeworkDayIndex != null ? `${att.homeworkDayIndex + 1}일차 · ` : ''}
                            {att.correctCount}/{att.problemCount}문제 · 오답 {att.wrongAnswers.length}개
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[10px] text-text-secondary">{relativeTime(att.completedAt)}</span>
                          {isExp ? <ChevronUp className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />}
                        </div>
                      </button>

                      {isExp && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2.5 space-y-1.5">
                          {att.wrongAnswers.map((wa: any, i: number) => (
                            <div key={i} className="bg-white rounded-sm border border-red-100 px-2.5 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-text-primary font-medium mb-1 [&_p]:inline [&_p]:m-0">
                                    #{wa.problemIndex + 1}. <MathRenderer content={wa.content} />
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px]">
                                    <span className="text-red-500 [&_p]:inline [&_p]:m-0">
                                      학생: <span className="font-semibold"><MathRenderer content={wa.selectedAnswer} /></span>
                                    </span>
                                    <span className="text-emerald-600 [&_p]:inline [&_p]:m-0">
                                      정답: <span className="font-semibold"><MathRenderer content={wa.correctAnswer} /></span>
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-text-secondary shrink-0">{wa.timeSpentSeconds}초</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* 액션 */}
      <div className="border-t border-slate-200 pt-3 mt-4">
        <h3 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">액션</h3>
        <div className="flex flex-wrap gap-2">
          {!showTeachers && (
            <Link
              href={`/students/${user.seq}/wrong-answers`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-sm transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              오답 관리
            </Link>
          )}
          <button
            onClick={() => onResetPassword(user.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            비밀번호 초기화
          </button>
          {isAdmin && showTeachers && (
            <button
              onClick={() => onDelete(user.id, user.name)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherDetail({ user, stats, statsLoading, isAdmin, onResetPassword, onDelete }: {
  user: UserItem;
  stats: TeacherStats | null;
  statsLoading: boolean;
  isAdmin: boolean;
  onResetPassword: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const s = stats?.summary;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-sm bg-violet-100 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-violet-600">{user.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary">{user.name}</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-sm">
              <Shield className="w-3 h-3" />
              선생님
            </span>
          </div>
          <p className="text-xs text-text-secondary">@{user.username}</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <InfoBox label="가입일" value={new Date(user.createdAt).toLocaleDateString('ko-KR')} icon={Calendar} />
        <InfoBox label="최근 활동" value={relativeTime(user.profile?.lastActiveAt ?? null)} icon={Clock} />
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-8 text-text-secondary text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> 상세 정보 불러오는 중...
        </div>
      ) : s && (
        <>
          {/* 활동 요약 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1">
            <div className="bg-blue-50 rounded-sm p-2.5">
              <div className="text-[10px] text-blue-600 font-medium">출제 시험</div>
              <div className="text-sm font-bold text-blue-700">{s.testsCreated}개</div>
            </div>
            <div className="bg-amber-50 rounded-sm p-2.5">
              <div className="text-[10px] text-amber-600 font-medium">숙제 플랜</div>
              <div className="text-sm font-bold text-amber-700">{s.homeworkPlans}개</div>
            </div>
            <div className="bg-emerald-50 rounded-sm p-2.5">
              <div className="text-[10px] text-emerald-600 font-medium">학생 코멘트</div>
              <div className="text-sm font-bold text-emerald-700">{s.commentsWritten}건</div>
            </div>
            <div className="bg-violet-50 rounded-sm p-2.5">
              <div className="text-[10px] text-violet-600 font-medium">AI 문제 생성</div>
              <div className="text-sm font-bold text-violet-700">{s.questionsGenerated}건</div>
            </div>
          </div>

          {/* 최근 출제 시험 */}
          {stats!.recentTests.length > 0 && (
            <>
              <SectionTitle icon={ClipboardCheck} title="최근 출제 시험" />
              <div className="space-y-1.5">
                {stats!.recentTests.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-sm px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{t.title}</div>
                      <div className="text-[10px] text-text-secondary">
                        {gradeLabel(t.grade)} · {t.questionCount}문제 · {relativeTime(t.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2 text-[10px] text-text-secondary">
                      <span>응시 {t._count.attempts}회</span>
                      <span>배정 {t._count.assignments}명</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 최근 숙제 플랜 */}
          {stats!.recentHomework.length > 0 && (
            <>
              <SectionTitle icon={Calculator} title="최근 연산 숙제" />
              <div className="space-y-1.5">
                {stats!.recentHomework.map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-sm px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{h.title}</div>
                      <div className="text-[10px] text-text-secondary">
                        {h.totalDays}일 × {h.dailyCount}문제 · {relativeTime(h.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] text-text-secondary">{h._count.enrollments}명 참여</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        h.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-text-secondary'
                      }`}>
                        {h.isActive ? '진행 중' : '종료'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 최근 학생 코멘트 */}
          {stats!.recentComments.length > 0 && (
            <>
              <SectionTitle icon={MessageSquare} title="최근 학생 코멘트" />
              <div className="space-y-1.5">
                {stats!.recentComments.map((c: any, i: number) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-sm px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-primary">{c.student.name}</span>
                      <span className="text-[10px] text-text-secondary">{c.month}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary line-clamp-2">{c.content}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* 액션 */}
      <div className="border-t border-slate-200 pt-3 mt-4">
        <h3 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">액션</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onResetPassword(user.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            비밀번호 초기화
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(user.id, user.name)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function StudentsPage() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const isAdmin = currentUser?.role === 'ADMIN';
  const initialTab = searchParams.get('tab') === 'teachers' ? 'teachers' : 'students';

  const [tab, setTab] = useState<'students' | 'teachers'>(initialTab);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', grade: 5 });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // 상세 통계
  const [stats, setStats] = useState<StudentStats | TeacherStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    if (res.ok) {
      const json = await res.json();
      setUsers(json.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // 사용자 선택 시 상세 통계 로드
  const fetchStats = useCallback(async (userId: string) => {
    setStatsLoading(true);
    setStats(null);
    try {
      const res = await fetch(`/api/users/${userId}/stats`);
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const showTeachers = isAdmin && tab === 'teachers';

  const filteredUsers = users
    .filter((u) => showTeachers ? u.role === 'TEACHER' : u.role === 'STUDENT')
    .filter((u) => u.name.includes(search) || u.username.includes(search))
    .filter((u) => {
      if (showTeachers) return true;
      if (gradeFilter !== 'all' && String(u.grade) !== gradeFilter) return false;
      if (levelFilter !== 'all') {
        const level = u.profile?.level ?? 1;
        if (levelFilter === 'low' && level > 2) return false;
        if (levelFilter === 'mid' && (level < 3 || level > 5)) return false;
        if (levelFilter === 'high' && level < 6) return false;
      }
      if (activityFilter !== 'all') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const isRecent = new Date(u.createdAt).getTime() > sevenDaysAgo;
        const hasActivity = (u.profile?.totalXp ?? 0) > 0;
        if (activityFilter === 'active' && !hasActivity) return false;
        if (activityFilter === 'inactive' && hasActivity) return false;
        if (activityFilter === 'new' && !isRecent) return false;
      }
      return true;
    });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const json = await res.json();
      setFormError(json.error?.message ?? '생성 실패');
      return;
    }
    setShowForm(false);
    setFormData({ username: '', password: '', name: '', grade: 5 });
    fetchUsers();
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('비밀번호를 1234로 초기화하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '1234' }),
      });
      if (res.ok) toast.success('비밀번호가 초기화되었습니다.');
      else toast.error('비밀번호 초기화에 실패했습니다.');
    } catch {
      toast.error('비밀번호 초기화에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`${name} 계정을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      if (selectedUser?.id === userId) { setSelectedUser(null); setStats(null); }
      fetchUsers();
    } else toast.error('삭제 실패');
  };

  const handleExportCSV = () => {
    const headers = ['이름', '아이디', '학년', '레벨', 'XP', '연속학습', '최근활동', '가입일'];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.username,
      gradeLabel(u.grade),
      `Lv.${u.profile?.level ?? 1}`,
      String(u.profile?.totalXp ?? 0),
      `${u.profile?.currentStreak ?? 0}일`,
      u.profile?.lastActiveAt ? relativeTime(u.profile.lastActiveAt) : '없음',
      new Date(u.createdAt).toLocaleDateString('ko-KR'),
    ]);
    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학생목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddClick = () => {
    setSelectedUser(null);
    setStats(null);
    setShowForm(true);
    setFormError('');
    setFormData({ username: '', password: '', name: '', grade: 5 });
  };

  const handleSelectUser = (u: UserItem) => {
    setShowForm(false);
    setSelectedUser(u);
    fetchStats(u.id);
  };

  const studentCount = users.filter((u) => u.role === 'STUDENT').length;
  const teacherCount = users.filter((u) => u.role === 'TEACHER').length;
  const panelTitle = showTeachers ? '선생님 관리' : '학생 관리';
  const panelCount = showTeachers ? teacherCount : studentCount;

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel ===== */}
      <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${leftPanelCollapsed ? 'w-12' : 'w-72'}`}>
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            {!leftPanelCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <h1 className="text-sm font-bold text-text-primary truncate">{panelTitle}</h1>
                <span className="text-[10px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">{panelCount}</span>
              </div>
            )}
            <button
              onClick={() => setLeftPanelCollapsed((p) => !p)}
              className="p-1 hover:bg-slate-100 rounded-sm text-text-secondary transition-colors shrink-0"
              title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
            >
              {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!leftPanelCollapsed && (
          <>
            {isAdmin && (
              <div className="px-3 pt-2 pb-1 flex gap-1.5">
                <button
                  onClick={() => { setTab('students'); setSearch(''); setSelectedUser(null); setStats(null); setShowForm(false); }}
                  className={`flex-1 px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                    tab === 'students' ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >학생 ({studentCount})</button>
                <button
                  onClick={() => { setTab('teachers'); setSearch(''); setSelectedUser(null); setStats(null); setShowForm(false); }}
                  className={`flex-1 px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                    tab === 'teachers' ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >선생님 ({teacherCount})</button>
              </div>
            )}

            <div className="px-3 pt-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                  placeholder={showTeachers ? '선생님 이름 검색...' : '학생 이름 검색...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {!showTeachers && (
              <div className="px-3 pb-2 flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <select className="flex-1 min-w-0 px-1.5 py-1 text-[11px] border border-slate-200 rounded-sm bg-white focus:ring-1 focus:ring-primary/40" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                    <option value="all">전체 학년</option>
                    {[1,2,3,4,5,6,7,8,9].map((g) => (<option key={g} value={String(g)}>{gradeLabel(g)}</option>))}
                  </select>
                  <select className="flex-1 min-w-0 px-1.5 py-1 text-[11px] border border-slate-200 rounded-sm bg-white focus:ring-1 focus:ring-primary/40" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                    <option value="all">전체 레벨</option>
                    <option value="low">초급 (1-2)</option>
                    <option value="mid">중급 (3-5)</option>
                    <option value="high">고급 (6+)</option>
                  </select>
                </div>
                <select className="w-full px-1.5 py-1 text-[11px] border border-slate-200 rounded-sm bg-white focus:ring-1 focus:ring-primary/40" value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}>
                  <option value="all">전체 상태</option>
                  <option value="active">활동 중</option>
                  <option value="inactive">미참여</option>
                  <option value="new">최근 가입</option>
                </select>
                {(gradeFilter !== 'all' || levelFilter !== 'all' || activityFilter !== 'all') && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-secondary">필터 결과: <span className="font-bold text-text-primary">{filteredUsers.length}명</span></span>
                    <button onClick={() => { setGradeFilter('all'); setLevelFilter('all'); setActivityFilter('all'); }} className="text-[10px] text-primary font-semibold hover:underline">초기화</button>
                  </div>
                )}
              </div>
            )}

            <div className="px-3 pb-2 flex gap-1.5">
              {!showTeachers && (
                <>
                  <Button size="sm" className="flex-1 text-xs" onClick={handleAddClick}><UserPlus className="w-3.5 h-3.5 mr-1" />학생 추가</Button>
                  <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={handleExportCSV}><Download className="w-3.5 h-3.5 mr-1" />CSV 내보내기</Button>
                </>
              )}
            </div>
            <div className="border-b border-slate-200" />

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-text-secondary"><Users className="w-8 h-8 mx-auto mb-2 opacity-20" /><p className="text-sm">{showTeachers ? '선생님이 없습니다.' : '학생이 없습니다.'}</p></div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors ${
                      selectedUser?.id === u.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-white border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${showTeachers ? 'bg-violet-100' : 'bg-primary/10'}`}>
                        <span className={`text-xs font-bold ${showTeachers ? 'text-violet-600' : 'text-primary'}`}>{u.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-text-primary truncate">{u.name}</span>
                          <span className="text-[10px] text-text-secondary">@{u.username}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {!showTeachers ? (
                            <>
                              <span className="text-[10px] text-text-secondary">{gradeLabel(u.grade)}</span>
                              <span className="text-[10px] text-slate-300">&middot;</span>
                              <span className="text-[10px] font-medium text-primary">Lv.{u.profile?.level ?? 1}</span>
                              <span className="text-[10px] text-slate-300">&middot;</span>
                              <span className="text-[10px] text-text-secondary">{u.profile?.totalXp ?? 0} XP</span>
                              {u.profile?.lastActiveAt && (
                                <>
                                  <span className="text-[10px] text-slate-300">&middot;</span>
                                  <span className="text-[10px] text-text-secondary">{relativeTime(u.profile.lastActiveAt)}</span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-text-secondary">{new Date(u.createdAt).toLocaleDateString('ko-KR')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {leftPanelCollapsed && (
          <div className="flex-1 flex flex-col items-center pt-3 gap-2">
            <button onClick={() => setLeftPanelCollapsed(false)} className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors" title={`${panelTitle} 열기`}>
              <Users className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {/* ===== Right Panel ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {showForm ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-lg mx-auto p-3">
              <h2 className="text-sm font-semibold text-text-primary mb-1">새 학생 추가</h2>
              <p className="text-sm text-text-secondary mb-3">학생 계정 정보를 입력하세요.</p>
              <form onSubmit={handleCreate} className="flex flex-col gap-2">
                {formError && <div className="p-3 rounded-sm bg-red-50 border border-red-200 text-red-600 text-sm">{formError}</div>}
                <div><label className="block text-xs font-medium text-text-secondary mb-1">이름</label><input className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" placeholder="학생 이름" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required /></div>
                <div><label className="block text-xs font-medium text-text-secondary mb-1">아이디</label><input className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" placeholder="로그인 아이디" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required /></div>
                <div><label className="block text-xs font-medium text-text-secondary mb-1">초기 비밀번호</label><input className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" type="password" placeholder="초기 비밀번호" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required /></div>
                <div><label className="block text-xs font-medium text-text-secondary mb-1">학년</label><select className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" value={formData.grade} onChange={(e) => setFormData({...formData, grade: Number(e.target.value)})}>{[1,2,3,4,5,6,7,8,9].map((g) => (<option key={g} value={g}>{gradeLabel(g)}</option>))}</select></div>
                <div className="flex gap-3 pt-2"><Button type="submit">생성</Button><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>취소</Button></div>
              </form>
            </div>
          </div>
        ) : selectedUser ? (
          <div className="flex-1 overflow-y-auto">
            {showTeachers ? (
              <TeacherDetail
                user={selectedUser}
                stats={stats?.type === 'teacher' ? stats : null}
                statsLoading={statsLoading}
                isAdmin={isAdmin}
                onResetPassword={handleResetPassword}
                onDelete={handleDeleteUser}
              />
            ) : (
              <StudentDetail
                user={selectedUser}
                stats={stats?.type === 'student' ? stats : null}
                statsLoading={statsLoading}
                showTeachers={showTeachers}
                isAdmin={isAdmin}
                onResetPassword={handleResetPassword}
                onDelete={handleDeleteUser}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-15" />
              <p className="font-medium text-text-primary">{showTeachers ? '선생님을 선택하세요' : '학생을 선택하세요'}</p>
              <p className="text-sm mt-1">왼쪽 목록에서 선택하거나 새로 추가하세요</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
