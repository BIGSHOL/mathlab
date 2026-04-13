'use client';

import { useState, useEffect } from 'react';
import {
  RotateCcw,
  Trash2,
  AlertTriangle,
  Loader2,
  Star,
  Flame,
  Clock,
  ClipboardCheck,
  Calculator,
  BookOpen,
  Zap,
  FileText,
  Check,
  X,
  CalendarCheck,
  GitBranch,
  Timer,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { MathRenderer } from '@/components/math/MathRenderer';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';
import { SectionTitle } from './SectionTitle';
import { gradeLabel, relativeTime, shortDate, formatSeconds, STAGE_LABELS } from './helpers';
import type { UserItem, StudentStats, ArithmeticAnswerItem, HwWrongData } from './types';

interface StudentDetailProps {
  user: UserItem;
  stats: StudentStats | null;
  statsLoading: boolean;
  isManager?: boolean;
  isOwner: boolean;
  onResetPassword: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function StudentDetail({ user, stats, statsLoading, isManager, isOwner, onResetPassword, onDelete }: StudentDetailProps) {
  const s = stats?.summary;
  const accuracyPct = s && s.arithmeticTotal > 0
    ? Math.round((s.arithmeticCorrect / s.arithmeticTotal) * 100) : 0;

  // 연산 연습 상세 확장
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<ArithmeticAnswerItem[]>([]);
  const [attemptDetailLoading, setAttemptDetailLoading] = useState(false);

  // 상세 팝업 (시험/개념/배정/타임어택)
  const [detailPopup, setDetailPopup] = useState<{ type: string; id: string } | null>(null);

  // 연산 숙제 오답
  const [hwWrongData, setHwWrongData] = useState<HwWrongData | null>(null);
  const [hwWrongLoading, setHwWrongLoading] = useState(false);
  const [hwWrongExpanded, setHwWrongExpanded] = useState<string | null>(null);
  const [hwWrongPeriod, setHwWrongPeriod] = useState<string>('all');


  // 소속 반 + 배정 코스
  const [classroomName, setClassroomName] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ id: string; title: string; mode: string; status: string; totalConcepts: number }[]>([]);

  useEffect(() => {
    // 반 정보 — classroomId가 있으면 반 목록에서 매칭
    if (user.classroomId) {
      fetch('/api/classrooms')
        .then((r) => r.ok ? r.json() : null)
        .then((json) => {
          const list = json?.data ?? [];
          const found = list.find((c: { id: string; name: string }) => c.id === user.classroomId);
          if (found) setClassroomName(found.name);
        })
        .catch(() => {});
    }
    // 코스 정보 — 전체 조회 후 이 학생이 등록된 코스 필터
    fetch('/api/learning-courses')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const list = json?.data ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrolled = list.filter((c: any) =>
          c.enrollments?.some((e: { student: { id: string }; status?: string }) => e.student.id === user.id)
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCourses(enrolled.map((c: any) => {
          const enrollment = c.enrollments?.find((e: { student: { id: string } }) => e.student.id === user.id);
          const totalConcepts = c.concepts?.length ?? 0;
          return {
            id: c.id,
            title: c.title,
            mode: c.mode ?? 'sequential',
            status: enrollment?.status ?? 'ACTIVE',
            totalConcepts,
          };
        }));
      })
      .catch(() => {});
  }, [user.id, user.classroomId]);

  useEffect(() => {
    if (!stats) return;
    setHwWrongData(null);
    setHwWrongExpanded(null);
    setHwWrongLoading(true);
    fetch(`/api/arithmetic/homework-wrong-answers?studentId=${user.id}&period=${hwWrongPeriod}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
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

  const level = user.profile?.level ?? 1;
  const streak = user.profile?.currentStreak ?? 0;
  const longestStreak = user.profile?.longestStreak ?? 0;
  const totalXp = user.profile?.totalXp ?? 0;

  return (
    <div className="p-4 sm:p-6">
      {/* ── 프로필 히어로 ── */}
      <div className="bg-gradient-to-r from-primary/5 via-blue-50/50 to-violet-50/30 border border-slate-200 rounded-sm p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-4">
          {/* 아바타 */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-xl font-bold text-white">{user.name.charAt(0)}</span>
          </div>
          {/* 이름/아이디/학년 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">{user.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{gradeLabel(user.grade)}</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">@{user.username} · 가입 {new Date(user.createdAt).toLocaleDateString('ko-KR')}</p>
          </div>
          {/* 핵심 수치 */}
          <div className="hidden sm:flex items-center gap-5 shrink-0">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Star className="w-4 h-4" />
                <span className="text-lg font-bold">Lv.{level}</span>
              </div>
              <div className="text-xs text-text-secondary">레벨</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500">
                <Zap className="w-4 h-4" />
                <span className="text-lg font-bold">{totalXp.toLocaleString()}</span>
              </div>
              <div className="text-xs text-text-secondary">총 XP</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-500">
                <Flame className="w-4 h-4" />
                <span className="text-lg font-bold">{streak}일</span>
              </div>
              <div className="text-xs text-text-secondary">연속 학습{longestStreak > streak ? ` (최장 ${longestStreak}일)` : ''}</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-slate-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-semibold">{relativeTime(user.profile?.lastActiveAt ?? null)}</span>
              </div>
              <div className="text-xs text-text-secondary">최근 활동</div>
            </div>
          </div>
        </div>
        {/* 모바일용 수치 */}
        <div className="grid grid-cols-2 gap-2 mt-3 sm:hidden">
          <div className="text-center bg-white/60 rounded-sm py-1.5">
            <div className="text-xs font-bold text-primary">Lv.{level}</div>
            <div className="text-xs text-text-secondary">레벨</div>
          </div>
          <div className="text-center bg-white/60 rounded-sm py-1.5">
            <div className="text-xs font-bold text-amber-600">{totalXp.toLocaleString()}</div>
            <div className="text-xs text-text-secondary">XP</div>
          </div>
          <div className="text-center bg-white/60 rounded-sm py-1.5">
            <div className="text-xs font-bold text-orange-500">{streak}일</div>
            <div className="text-xs text-text-secondary">연속</div>
          </div>
          <div className="text-center bg-white/60 rounded-sm py-1.5">
            <div className="text-xs font-bold text-slate-600">{relativeTime(user.profile?.lastActiveAt ?? null)}</div>
            <div className="text-xs text-text-secondary">활동</div>
          </div>
        </div>
      </div>

      {/* ── 소속 반 · 학습 코스 ── */}
      {(classroomName || courses.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {classroomName && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-sm text-sm">
              <GitBranch className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-violet-700 font-medium">{classroomName}</span>
            </div>
          )}
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-sm text-sm hover:bg-emerald-100 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-700 font-medium">{c.title}</span>
              {c.totalConcepts > 0 && <span className="text-xs text-emerald-500">{c.totalConcepts}개념</span>}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                c.status === 'COMPLETED' ? 'bg-emerald-200 text-emerald-800' :
                c.status === 'LOCKED' ? 'bg-slate-100 text-slate-500' :
                'bg-blue-100 text-blue-700'
              }`}>
                {c.status === 'COMPLETED' ? '완료' : c.status === 'LOCKED' ? '대기' : '진행중'}
              </span>
            </Link>
          ))}
        </div>
      )}

      {statsLoading ? (
        <div className="flex items-center justify-center py-8 text-text-secondary text-xs">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> 상세 정보 불러오는 중...
        </div>
      ) : s && (
        <>
          {/* ── 학습 요약 카드 ── */}
          <div className="flex flex-wrap gap-2 mb-4 [&>div]:flex-1 [&>div]:min-w-[130px]">
            <div className="bg-white border border-blue-200 rounded-sm p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-10 h-10 bg-blue-500/5 rounded-bl-full" />
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="text-lg font-bold text-blue-700">{s.testCount}<span className="text-xs font-medium ml-0.5">회</span></div>
              </div>
              <div className="text-xs text-blue-500 mt-0.5">시험 · 평균 {s.testAvgScore}점</div>
            </div>
            <div className="bg-white border border-amber-200 rounded-sm p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-10 h-10 bg-amber-500/5 rounded-bl-full" />
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="text-lg font-bold text-amber-700">{s.arithmeticCount}<span className="text-xs font-medium ml-0.5">회</span></div>
              </div>
              <div className="text-xs text-amber-500 mt-0.5">연산 · 정답률 {accuracyPct}%</div>
            </div>
            <div className="bg-white border border-emerald-200 rounded-sm p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-10 h-10 bg-emerald-500/5 rounded-bl-full" />
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="text-lg font-bold text-emerald-700">{s.learningCompleted}<span className="text-xs font-medium text-emerald-400 ml-0.5">/{s.learningTotal}</span></div>
              </div>
              <div className="text-xs text-emerald-500 mt-0.5">개념 학습 완료</div>
            </div>
            <div className="bg-white border border-violet-200 rounded-sm p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-10 h-10 bg-violet-500/5 rounded-bl-full" />
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-violet-500 shrink-0" />
                <div className="text-lg font-bold text-violet-700">{s.homeworkEnrollments}<span className="text-xs font-medium ml-0.5">개</span></div>
              </div>
              <div className="text-xs text-violet-500 mt-0.5">연산 숙제 참여</div>
            </div>
            {(s.timeAttackCount ?? 0) > 0 && (
              <div className="bg-white border border-rose-200 rounded-sm p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-10 h-10 bg-rose-500/5 rounded-bl-full" />
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="text-lg font-bold text-rose-700">{s.timeAttackCount}<span className="text-xs font-medium ml-0.5">회</span></div>
                </div>
                <div className="text-xs text-rose-500 mt-0.5">타임어택 도전</div>
              </div>
            )}
          </div>

          {/* ── 2단 레이아웃 (각 섹션이 grid item → 좌우 줄맞춤) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 items-start">
            {/* Row 1: 최근 시험 | 최근 연산 연습 */}
            {stats!.recentTests.length > 0 ? (
              <div>
                <SectionTitle icon={ClipboardCheck} title="최근 시험" />
                <div className="space-y-1.5">
                  {stats!.recentTests.map((t) => (
                    <button key={t.id} onClick={() => setDetailPopup({ type: 'test', id: t.id })} className="w-full flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-blue-300 transition-colors text-left">
                      <div className="w-1 self-stretch bg-blue-400 shrink-0" />
                      <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-text-primary truncate">{t.test.title}</div>
                          <div className="text-xs text-text-secondary">{shortDate(t.completedAt ?? t.startedAt)}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {t.completedAt ? (
                            <div className="text-right">
                              <div className="text-xs font-bold text-text-primary">{t.score}/{t.maxScore}점</div>
                              <div className="text-xs text-text-secondary">{t.correctCount}/{t.totalCount}문제</div>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">진행 중</span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : <div />}

            {stats!.recentArithmetic.length > 0 ? (
              <div>
                <SectionTitle icon={Calculator} title="최근 연산 연습" />
                <div className="space-y-1.5">
                  {stats!.recentArithmetic.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => toggleAttemptDetail(a.id)}
                      className="w-full flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-amber-300 transition-colors text-left"
                    >
                      <div className="w-1 self-stretch bg-amber-400 shrink-0" />
                      <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-text-primary">{CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS] ?? a.category}</div>
                          <div className="text-xs text-text-secondary">{shortDate(a.completedAt ?? a.createdAt)}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <div className="text-right">
                            <div className="text-xs font-bold text-text-primary">{a.correctCount}/{a.problemCount}</div>
                            <div className="text-xs text-text-secondary">{formatSeconds(a.totalTimeSeconds ?? 0)}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : <div />}

            {/* Row 2: 최근 개념 학습 | 타임어택 기록 */}
            {stats!.recentLearning.length > 0 ? (
              <div>
                <SectionTitle icon={BookOpen} title="최근 개념 학습" />
                <div className="space-y-1.5">
                  {stats!.recentLearning.map((lp) => (
                    <button key={lp.id} onClick={() => setDetailPopup({ type: 'concept', id: lp.id })} className="w-full flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-emerald-300 transition-colors text-left">
                      <div className={`w-1 self-stretch shrink-0 ${lp.completed ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-text-primary truncate">{lp.concept.title}</div>
                          <div className="text-xs text-text-secondary">
                            {STAGE_LABELS[lp.stage] ?? lp.stage} · {shortDate(lp.completedAt ?? lp.startedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            lp.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {lp.completed ? '완료' : STAGE_LABELS[lp.stage] ?? lp.stage}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : <div />}

            {stats!.recentTimeAttacks && stats!.recentTimeAttacks.length > 0 ? (() => {
              const bestMap = new Map<string, number>();
              for (const b of s.timeAttackBestByCategory ?? []) {
                bestMap.set(`${b.category}:${b.level}`, b.best);
              }
              return (
                <div>
                  <SectionTitle icon={Timer} title="타임어택 기록" />
                  <div className="space-y-1.5">
                    {stats!.recentTimeAttacks.map((ta) => {
                      const isBest = bestMap.get(`${ta.category}:${ta.level}`) === ta.correctCount;
                      return (
                        <button key={ta.id} onClick={() => setDetailPopup({ type: 'timeAttack', id: ta.id })} className="w-full flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-rose-300 transition-colors text-left">
                          <div className="w-1 self-stretch bg-rose-400 shrink-0" />
                          <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-text-primary">
                                {CATEGORY_LABELS[ta.category as keyof typeof CATEGORY_LABELS] ?? ta.category}
                                <span className="text-text-secondary ml-1.5">
                                  {ta.level === 'easy' ? '쉬움' : ta.level === 'medium' ? '보통' : '어려움'}
                                </span>
                              </div>
                              <div className="text-xs text-text-secondary">{shortDate(ta.createdAt)}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {isBest && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-rose-50 text-rose-500 font-medium border border-rose-200">최고</span>
                              )}
                              <div className="text-right">
                                <div className="text-xs font-bold text-text-primary">{ta.correctCount}개 정답</div>
                                <div className="text-xs text-text-secondary">{ta.totalTime}초</div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })() : <div />}

            {/* Row 3: 시험 배정 현황 | 최근 XP 내역 */}
            {stats!.recentAssignments.length > 0 ? (
              <div>
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
                      <button key={i} onClick={() => setDetailPopup({ type: 'assignment', id: String(i) })} className="w-full flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-violet-300 transition-colors text-left">
                        <div className={`w-1 self-stretch shrink-0 ${
                          a.status === 'COMPLETED' ? 'bg-emerald-400' :
                          a.status === 'OVERDUE' ? 'bg-red-400' :
                          a.status === 'IN_PROGRESS' ? 'bg-amber-400' : 'bg-blue-400'
                        }`} />
                        <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-text-primary truncate">{a.test.title}</div>
                            {a.dueDate && <div className="text-xs text-text-secondary">마감: {new Date(a.dueDate).toLocaleDateString('ko-KR')}</div>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {a.bestScore != null && <span className="text-xs font-bold text-text-primary">{a.bestScore}점</span>}
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor[a.status] ?? 'bg-slate-100 text-text-secondary'}`}>
                              {statusLabel[a.status] ?? a.status}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : <div />}

            {isManager && stats!.recentPoints.length > 0 ? (
              <div>
                <SectionTitle icon={Zap} title="최근 XP 내역" />
                {(() => {
                  const pts = stats!.recentPoints;
                  const totalEarn = pts.filter(p => p.type === 'EARN').reduce((s, p) => s + p.amount, 0);
                  return (
                    <button
                      onClick={() => setDetailPopup({ type: 'xp', id: 'all' })}
                      className="w-full flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-amber-300 transition-colors text-left"
                    >
                      <div className="w-1 self-stretch bg-amber-400 shrink-0" />
                      <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-text-primary">최근 {pts.length}건</div>
                          <div className="text-xs text-text-secondary">{shortDate(pts[pts.length - 1]?.createdAt)} ~ {shortDate(pts[0]?.createdAt)}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-xs font-bold text-amber-600">+{totalEarn} XP</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </div>
                    </button>
                  );
                })()}
              </div>
            ) : <div />}

            {/* Row 4 제거됨: "개념 학습 순서" → 코스 시스템으로 대체 */}

            {/* Row 5: 연산 숙제 오답 | (빈 칸) */}
            {(hwWrongData || hwWrongLoading) && (
              <div>
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

                {hwWrongData && hwWrongData.totalWrong > 0 && (
                  <div className="space-y-1.5">
                    {hwWrongData.attempts.map((att) => (
                      <button
                        key={att.id}
                        onClick={() => setHwWrongExpanded(att.id)}
                        className="w-full flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-orange-300 transition-colors text-left"
                      >
                        <div className="w-1 self-stretch bg-orange-400 shrink-0" />
                        <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                          <div className="min-w-0">
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
                            {(() => {
                              const acc = att.problemCount > 0 ? Math.round((att.correctCount / att.problemCount) * 100) : 0;
                              return (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium border ${
                                  acc < 70 ? 'bg-red-50 text-red-500 border-red-200' :
                                  acc < 85 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                  'bg-emerald-50 text-emerald-600 border-emerald-200'
                                }`}>{acc}%</span>
                              );
                            })()}
                            <span className="text-xs text-text-secondary">{shortDate(att.completedAt)}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(hwWrongData || hwWrongLoading) && <div />}
          </div>

          {/* 연산 연습 상세 팝업 */}
          {expandedAttemptId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { setExpandedAttemptId(null); setAttemptAnswers([]); }}>
              <div
                className="bg-white rounded-sm shadow-xl border border-slate-200 w-full max-w-lg max-h-[70vh] flex flex-col mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const att = stats!.recentArithmetic.find((a) => a.id === expandedAttemptId);
                  return att ? (
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
                      <div>
                        <div className="text-sm font-bold text-text-primary">{CATEGORY_LABELS[att.category as keyof typeof CATEGORY_LABELS] ?? att.category}</div>
                        <div className="text-xs text-text-secondary">{att.correctCount}/{att.problemCount}문제 · {formatSeconds(att.totalTimeSeconds ?? 0)}</div>
                      </div>
                      <button onClick={() => { setExpandedAttemptId(null); setAttemptAnswers([]); }} className="p-1 hover:bg-slate-100 rounded-sm transition-colors">
                        <X className="w-4 h-4 text-text-secondary" />
                      </button>
                    </div>
                  ) : null;
                })()}
                <div className="overflow-y-auto px-4 py-3">
                  {attemptDetailLoading ? (
                    <div className="flex items-center justify-center py-6 text-text-secondary text-xs">
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> 불러오는 중...
                    </div>
                  ) : attemptAnswers.length === 0 ? (
                    <div className="text-center py-6 text-xs text-text-secondary">답안 데이터가 없습니다</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-3 text-xs">
                        <span className="text-emerald-600 font-medium">정답 {attemptAnswers.filter((ans) => ans.isCorrect).length}개</span>
                        <span className="text-red-500 font-medium">오답 {attemptAnswers.filter((ans) => !ans.isCorrect).length}개</span>
                        <span className="text-text-secondary">
                          평균 {Math.round(attemptAnswers.reduce((sum, ans) => sum + ans.timeSpentSeconds, 0) / attemptAnswers.length)}초/문제
                        </span>
                      </div>

                      {attemptAnswers.filter((ans) => !ans.isCorrect).length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          <div className="text-xs font-bold text-red-500 flex items-center gap-1">
                            <X className="w-3 h-3" /> 틀린 문제
                          </div>
                          {attemptAnswers.filter((ans) => !ans.isCorrect).map((ans) => (
                            <div key={ans.problemIndex} className="bg-slate-50 rounded-sm border border-red-100 px-3 py-2.5">
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
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 연산 숙제 오답 상세 팝업 */}
          {hwWrongExpanded && hwWrongData && (() => {
            const att = hwWrongData.attempts.find((a) => a.id === hwWrongExpanded);
            if (!att) return null;
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setHwWrongExpanded(null)}>
                <div
                  className="bg-white rounded-sm shadow-xl border border-slate-200 w-full max-w-md max-h-[70vh] flex flex-col mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
                    <div>
                      <div className="text-sm font-bold text-text-primary">{att.categoryLabel}</div>
                      <div className="text-xs text-text-secondary">
                        {att.planTitle && `${att.planTitle} · `}
                        {att.homeworkDayIndex != null ? `${att.homeworkDayIndex + 1}일차 · ` : ''}
                        {att.correctCount}/{att.problemCount}문제
                      </div>
                    </div>
                    <button onClick={() => setHwWrongExpanded(null)} className="p-1 hover:bg-slate-100 rounded-sm transition-colors">
                      <X className="w-4 h-4 text-text-secondary" />
                    </button>
                  </div>
                  <div className="overflow-y-auto px-4 py-3 space-y-2">
                    {att.wrongAnswers.map((wa, i) => (
                      <div key={i} className="bg-slate-50 rounded-sm border border-red-100 px-3 py-2.5">
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
                </div>
              </div>
            );
          })()}

          {/* 상세 정보 팝업 (시험/개념/배정/타임어택) */}
          {detailPopup && (() => {
            const close = () => setDetailPopup(null);
            const statusLabels: Record<string, string> = { ASSIGNED: '배정됨', IN_PROGRESS: '진행 중', COMPLETED: '완료', OVERDUE: '기한 초과' };
            const levelLabels: Record<string, string> = { easy: '쉬움', medium: '보통', hard: '어려움' };

            if (detailPopup.type === 'test') {
              const t = stats?.recentTests.find((x) => x.id === detailPopup.id);
              if (!t) return null;
              const pct = (t.maxScore ?? 0) > 0 ? Math.round(((t.score ?? 0) / (t.maxScore ?? 1)) * 100) : 0;
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={close}>
                  <div className="bg-white rounded-sm shadow-xl border border-slate-200 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                      <div className="text-sm font-bold text-text-primary">{t.test.title}</div>
                      <button onClick={close} className="p-1 hover:bg-slate-100 rounded-sm"><X className="w-4 h-4 text-text-secondary" /></button>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{t.score}<span className="text-lg text-text-secondary">/{t.maxScore}</span></div>
                          <div className="text-xs text-text-secondary mt-0.5">점수</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-sm p-2.5 text-center">
                          <div className="text-sm font-bold text-text-primary">{t.correctCount}/{t.totalCount}</div>
                          <div className="text-xs text-text-secondary">정답/전체</div>
                        </div>
                        <div className="bg-slate-50 rounded-sm p-2.5 text-center">
                          <div className="text-sm font-bold text-text-primary">{pct}%</div>
                          <div className="text-xs text-text-secondary">정답률</div>
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary space-y-1">
                        <div className="flex justify-between"><span>응시일</span><span className="text-text-primary">{new Date(t.startedAt).toLocaleDateString('ko-KR')}</span></div>
                        <div className="flex justify-between"><span>상태</span><span className="text-text-primary">{t.completedAt ? '완료' : '진행 중'}</span></div>
                        {t.completedAt && <div className="flex justify-between"><span>완료일</span><span className="text-text-primary">{new Date(t.completedAt).toLocaleDateString('ko-KR')}</span></div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (detailPopup.type === 'concept') {
              const lp = stats?.recentLearning.find((x) => x.id === detailPopup.id);
              if (!lp) return null;
              const stages = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL', 'BLANK_PAGE'];
              const currentIdx = stages.indexOf(lp.stage);
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={close}>
                  <div className="bg-white rounded-sm shadow-xl border border-slate-200 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                      <div className="text-sm font-bold text-text-primary">{lp.concept.title}</div>
                      <button onClick={close} className="p-1 hover:bg-slate-100 rounded-sm"><X className="w-4 h-4 text-text-secondary" /></button>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      <div className="text-center">
                        <span className={`inline-block text-sm font-bold px-3 py-1 rounded-sm ${lp.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {lp.completed ? '학습 완료' : '진행 중'}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-text-secondary">학습 단계</div>
                        {stages.map((stage, idx) => (
                          <div key={stage} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-xs ${
                            idx < currentIdx ? 'bg-emerald-50 text-emerald-700' :
                            idx === currentIdx ? (lp.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-primary/5 text-primary font-bold border border-primary/20') :
                            'bg-slate-50 text-text-secondary'
                          }`}>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs shrink-0 ${
                              idx < currentIdx || (idx === currentIdx && lp.completed) ? 'bg-emerald-500 text-white' :
                              idx === currentIdx ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                            }`}>{idx < currentIdx || (idx === currentIdx && lp.completed) ? '✓' : idx + 1}</span>
                            {STAGE_LABELS[stage] ?? stage}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-text-secondary space-y-1">
                        <div className="flex justify-between"><span>시작일</span><span className="text-text-primary">{new Date(lp.startedAt).toLocaleDateString('ko-KR')}</span></div>
                        {lp.completedAt && <div className="flex justify-between"><span>완료일</span><span className="text-text-primary">{new Date(lp.completedAt).toLocaleDateString('ko-KR')}</span></div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (detailPopup.type === 'assignment') {
              const a = stats?.recentAssignments[Number(detailPopup.id)];
              if (!a) return null;
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={close}>
                  <div className="bg-white rounded-sm shadow-xl border border-slate-200 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                      <div className="text-sm font-bold text-text-primary">{a.test.title}</div>
                      <button onClick={close} className="p-1 hover:bg-slate-100 rounded-sm"><X className="w-4 h-4 text-text-secondary" /></button>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      <div className="text-center">
                        <span className={`inline-block text-sm font-bold px-3 py-1 rounded-sm ${
                          a.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          a.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                          a.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>{statusLabels[a.status] ?? a.status}</span>
                      </div>
                      {a.bestScore != null && (
                        <div className="bg-slate-50 rounded-sm p-3 text-center">
                          <div className="text-2xl font-bold text-text-primary">{a.bestScore}<span className="text-sm text-text-secondary">점</span></div>
                          <div className="text-xs text-text-secondary">최고 점수</div>
                        </div>
                      )}
                      <div className="text-xs text-text-secondary space-y-1">
                        {a.dueDate && <div className="flex justify-between"><span>마감일</span><span className="text-text-primary">{new Date(a.dueDate).toLocaleDateString('ko-KR')}</span></div>}
                        <div className="flex justify-between"><span>상태</span><span className="text-text-primary">{statusLabels[a.status] ?? a.status}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (detailPopup.type === 'timeAttack') {
              const ta = stats?.recentTimeAttacks?.find((x) => x.id === detailPopup.id);
              if (!ta) return null;
              const bestMap = new Map<string, number>();
              for (const b of s.timeAttackBestByCategory ?? []) bestMap.set(`${b.category}:${b.level}`, b.best);
              const isBest = bestMap.get(`${ta.category}:${ta.level}`) === ta.correctCount;
              const avgTime = ta.correctCount > 0 ? (ta.totalTime / ta.correctCount).toFixed(1) : '-';
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={close}>
                  <div className="bg-white rounded-sm shadow-xl border border-slate-200 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                      <div>
                        <div className="text-sm font-bold text-text-primary">{CATEGORY_LABELS[ta.category as keyof typeof CATEGORY_LABELS] ?? ta.category}</div>
                        <div className="text-xs text-text-secondary">{levelLabels[ta.level] ?? ta.level}</div>
                      </div>
                      <button onClick={close} className="p-1 hover:bg-slate-100 rounded-sm"><X className="w-4 h-4 text-text-secondary" /></button>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      <div className="text-center">
                        {isBest && <span className="inline-block text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-500 font-medium border border-rose-200 mb-2">최고 기록</span>}
                        <div className="text-3xl font-bold text-rose-600">{ta.correctCount}<span className="text-lg text-text-secondary">개</span></div>
                        <div className="text-xs text-text-secondary">정답</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-sm p-2.5 text-center">
                          <div className="text-sm font-bold text-text-primary">{ta.totalTime}초</div>
                          <div className="text-xs text-text-secondary">총 시간</div>
                        </div>
                        <div className="bg-slate-50 rounded-sm p-2.5 text-center">
                          <div className="text-sm font-bold text-text-primary">{avgTime}초</div>
                          <div className="text-xs text-text-secondary">문제당 평균</div>
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary">
                        <div className="flex justify-between"><span>도전일</span><span className="text-text-primary">{new Date(ta.createdAt).toLocaleDateString('ko-KR')}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (detailPopup.type === 'xp') {
              const pts = stats?.recentPoints ?? [];
              const totalEarn = pts.filter(p => p.type === 'EARN').reduce((s, p) => s + p.amount, 0);
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={close}>
                  <div className="bg-white rounded-sm shadow-xl border border-slate-200 w-full max-w-sm mx-4 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
                      <div>
                        <div className="text-sm font-bold text-text-primary">최근 XP 내역</div>
                        <div className="text-xs text-text-secondary">총 <span className="font-bold text-amber-600">+{totalEarn} XP</span> 획득</div>
                      </div>
                      <button onClick={close} className="p-1 hover:bg-slate-100 rounded-sm"><X className="w-4 h-4 text-text-secondary" /></button>
                    </div>
                    <div className="overflow-y-auto divide-y divide-slate-100">
                      {pts.map((p, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-xs text-text-primary">{p.reason}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className={`text-xs font-bold ${p.type === 'EARN' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {p.type === 'EARN' ? '+' : '-'}{p.amount}
                            </span>
                            <span className="text-xs text-text-secondary w-14 text-right">{shortDate(p.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })()}
        </>
      )}

      {/* 액션 */}
      <div className="border-t border-slate-200 pt-4 mt-5">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">빠른 액션</h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/students/${user.seq}/wrong-answers`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-sm transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            오답 관리
          </Link>
          {isManager && (
            <button
              onClick={() => onResetPassword(user.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-primary bg-primary/5 border border-primary/20 hover:bg-primary/10 rounded-sm transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              비밀번호 초기화
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => onDelete(user.id, user.name)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-sm transition-colors"
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
