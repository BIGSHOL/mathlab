'use client';

import { useState, useEffect } from 'react';
import {
  RotateCcw,
  Trash2,
  AlertTriangle,
  Loader2,
  Calendar,
  Star,
  Flame,
  Clock,
  ClipboardCheck,
  Calculator,
  BookOpen,
  Zap,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  CalendarCheck,
  GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import { MathRenderer } from '@/components/math/MathRenderer';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';
import { InfoBox } from './InfoBox';
import { SectionTitle } from './SectionTitle';
import { gradeLabel, relativeTime, formatSeconds, STAGE_LABELS } from './helpers';
import type { UserItem, StudentStats, ArithmeticAnswerItem, HwWrongData } from './types';

interface StudentDetailProps {
  user: UserItem;
  stats: StudentStats | null;
  statsLoading: boolean;
  showTeachers: boolean;
  isOwner: boolean;
  onResetPassword: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function StudentDetail({ user, stats, statsLoading, showTeachers, isOwner, onResetPassword, onDelete }: StudentDetailProps) {
  const s = stats?.summary;
  const accuracyPct = s && s.arithmeticTotal > 0
    ? Math.round((s.arithmeticCorrect / s.arithmeticTotal) * 100) : 0;

  // 연산 연습 상세 확장
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<ArithmeticAnswerItem[]>([]);
  const [attemptDetailLoading, setAttemptDetailLoading] = useState(false);

  // 연산 숙제 오답
  const [hwWrongData, setHwWrongData] = useState<HwWrongData | null>(null);
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
      .catch((err) => console.error('개념 네비 설정 조회 실패:', err));
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
    } catch (err) { console.error('개념 네비 모드 저장 실패:', err); }
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
      .catch((err) => console.error('연산 숙제 오답 조회 실패:', err))
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
    } catch (err) { console.error('시도 상세 조회 실패:', err); }
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
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> 상세 정보 불러오는 중...
        </div>
      ) : s && (
        <>
          {/* 학습 요약 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1">
            <div className="bg-blue-50 rounded-sm p-3">
              <div className="text-sm text-blue-600 font-medium">시험 응시</div>
              <div className="text-sm font-bold text-blue-700">{s.testCount}회</div>
              <div className="text-xs text-blue-500">평균 {s.testAvgScore}점</div>
            </div>
            <div className="bg-amber-50 rounded-sm p-3">
              <div className="text-sm text-amber-600 font-medium">연산 연습</div>
              <div className="text-sm font-bold text-amber-700">{s.arithmeticCount}회</div>
              <div className="text-xs text-amber-500">정답률 {accuracyPct}%</div>
            </div>
            <div className="bg-emerald-50 rounded-sm p-3">
              <div className="text-sm text-emerald-600 font-medium">개념 학습</div>
              <div className="text-sm font-bold text-emerald-700">{s.learningCompleted}/{s.learningTotal}</div>
              <div className="text-xs text-emerald-500">완료/전체</div>
            </div>
            <div className="bg-violet-50 rounded-sm p-3">
              <div className="text-sm text-violet-600 font-medium">연산 숙제</div>
              <div className="text-sm font-bold text-violet-700">{s.homeworkEnrollments}개</div>
              <div className="text-xs text-violet-500">참여 플랜</div>
            </div>
          </div>

          {/* 개념 학습 순서 설정 */}
          <SectionTitle icon={GitBranch} title="개념 학습 순서" />
          <div className="bg-white border border-slate-200 rounded-sm p-3 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => saveNavMode('curriculum')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
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
                className={`px-2 py-1 rounded text-xs border transition-colors ${
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
            <p className="text-sm text-text-secondary mt-1.5">
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
                {stats!.recentTests.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-sm px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{t.test.title}</div>
                      <div className="text-xs text-text-secondary">{relativeTime(t.completedAt ?? t.startedAt)}</div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {t.completedAt ? (
                        <>
                          <div className="text-xs font-bold text-text-primary">{t.score}/{t.maxScore}점</div>
                          <div className="text-xs text-text-secondary">{t.correctCount}/{t.totalCount}문제</div>
                        </>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">진행 중</span>
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
                {stats!.recentArithmetic.map((a) => {
                  const isExpanded = expandedAttemptId === a.id;
                  const wrongAnswers = attemptAnswers.filter((ans) => !ans.isCorrect);
                  return (
                    <div key={a.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                      <button
                        onClick={() => toggleAttemptDetail(a.id)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 text-left">
                          <div className="text-xs font-medium text-text-primary">{CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS] ?? a.category}</div>
                          <div className="text-xs text-text-secondary">{relativeTime(a.completedAt ?? a.createdAt)}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="text-right">
                            <div className="text-xs font-bold text-text-primary">{a.correctCount}/{a.problemCount}</div>
                            <div className="text-xs text-text-secondary">{formatSeconds(a.totalTimeSeconds ?? 0)}</div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-slate-50/50">
                          {attemptDetailLoading ? (
                            <div className="flex items-center justify-center py-4 text-text-secondary text-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> 불러오는 중...
                            </div>
                          ) : attemptAnswers.length === 0 ? (
                            <div className="text-center py-4 text-xs text-text-secondary">답안 데이터가 없습니다</div>
                          ) : (
                            <div className="px-3 py-2.5">
                              {/* 요약 바 */}
                              <div className="flex items-center gap-3 mb-2 text-xs">
                                <span className="text-emerald-600 font-medium">정답 {attemptAnswers.filter((ans) => ans.isCorrect).length}개</span>
                                <span className="text-red-500 font-medium">오답 {wrongAnswers.length}개</span>
                                <span className="text-text-secondary">
                                  평균 {Math.round(attemptAnswers.reduce((s, ans) => s + ans.timeSpentSeconds, 0) / attemptAnswers.length)}초/문제
                                </span>
                              </div>

                              {/* 틀린 문제 표시 */}
                              {wrongAnswers.length > 0 && (
                                <div className="space-y-1.5 mb-2">
                                  <div className="text-xs font-bold text-red-500 flex items-center gap-1">
                                    <X className="w-3 h-3" /> 틀린 문제
                                  </div>
                                  {wrongAnswers.map((ans) => (
                                    <div key={ans.problemIndex} className="bg-white rounded-sm border border-red-100 px-2.5 py-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs text-text-primary font-medium mb-1 [&_p]:inline [&_p]:m-0">
                                            #{ans.problemIndex + 1}. <MathRenderer content={ans.content} />
                                          </div>
                                          <div className="flex items-center gap-3 text-xs">
                                            <span className="text-red-500 [&_p]:inline [&_p]:m-0">
                                              학생: <span className="font-semibold"><MathRenderer content={ans.selectedAnswer} /></span>
                                            </span>
                                            <span className="text-emerald-600 [&_p]:inline [&_p]:m-0">
                                              정답: <span className="font-semibold"><MathRenderer content={ans.correctAnswer} /></span>
                                            </span>
                                          </div>
                                        </div>
                                        <span className="text-xs text-text-secondary shrink-0">{ans.timeSpentSeconds}초</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 전체 문제 그리드 */}
                              <div className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                                <Check className="w-3 h-3" /> 전체 정오표
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {attemptAnswers.map((ans) => (
                                  <div
                                    key={ans.problemIndex}
                                    className={`w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold ${
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
                {stats!.recentLearning.map((lp) => (
                  <div key={lp.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-sm px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{lp.concept.title}</div>
                      <div className="text-xs text-text-secondary">
                        {STAGE_LABELS[lp.stage] ?? lp.stage} · {relativeTime(lp.completedAt ?? lp.startedAt)}
                      </div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
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
                {stats!.recentAssignments.map((a, i) => {
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
                    <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-sm px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">{a.test.title}</div>
                        {a.dueDate && <div className="text-xs text-text-secondary">마감: {new Date(a.dueDate).toLocaleDateString('ko-KR')}</div>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {a.bestScore != null && <span className="text-xs font-bold text-text-primary">{a.bestScore}점</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor[a.status] ?? 'bg-slate-100 text-text-secondary'}`}>
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
                {stats!.recentPoints.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5">
                    <div className="text-xs text-text-secondary">{p.reason}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${p.type === 'EARN' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {p.type === 'EARN' ? '+' : '-'}{p.amount}
                      </span>
                      <span className="text-xs text-text-secondary">{relativeTime(p.createdAt)}</span>
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
              className="text-xs border border-slate-200 rounded-sm px-1.5 py-0.5 bg-white text-text-secondary"
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
                  {hwWrongData.categorySummary.map((cat) => (
                    <div
                      key={cat.category}
                      className={`px-2 py-1 rounded-sm text-xs font-medium ${
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
                {hwWrongData.attempts.map((att) => {
                  const isExp = hwWrongExpanded === att.id;
                  return (
                    <div key={att.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                      <button
                        onClick={() => setHwWrongExpanded(isExp ? null : att.id)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 text-left">
                          <div className="text-xs font-medium text-text-primary">
                            {att.categoryLabel}
                            {att.planTitle && <span className="text-xs text-text-secondary ml-1.5">· {att.planTitle}</span>}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {att.homeworkDayIndex != null ? `${att.homeworkDayIndex + 1}일차 · ` : ''}
                            {att.correctCount}/{att.problemCount}문제 · 오답 {att.wrongAnswers.length}개
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-text-secondary">{relativeTime(att.completedAt)}</span>
                          {isExp ? <ChevronUp className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />}
                        </div>
                      </button>

                      {isExp && (
                        <div className="border-t border-slate-200 bg-slate-50/50 px-3 py-2.5 space-y-1.5">
                          {att.wrongAnswers.map((wa, i) => (
                            <div key={i} className="bg-white rounded-sm border border-red-100 px-2.5 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-text-primary font-medium mb-1 [&_p]:inline [&_p]:m-0">
                                    #{wa.problemIndex + 1}. <MathRenderer content={wa.content} />
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-red-500 [&_p]:inline [&_p]:m-0">
                                      학생: <span className="font-semibold"><MathRenderer content={wa.selectedAnswer} /></span>
                                    </span>
                                    <span className="text-emerald-600 [&_p]:inline [&_p]:m-0">
                                      정답: <span className="font-semibold"><MathRenderer content={wa.correctAnswer} /></span>
                                    </span>
                                  </div>
                                </div>
                                <span className="text-xs text-text-secondary shrink-0">{wa.timeSpentSeconds}초</span>
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
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">액션</h3>
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
          {isOwner && showTeachers && (
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
