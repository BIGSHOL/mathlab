'use client';

import {
  RotateCcw,
  Trash2,
  Loader2,
  Calendar,
  Shield,
  Clock,
  ClipboardCheck,
  Calculator,
  MessageSquare,
} from 'lucide-react';
import { InfoBox } from './InfoBox';
import { SectionTitle } from './SectionTitle';
import { gradeLabel, relativeTime } from './helpers';
import type { UserItem, TeacherStats } from './types';

interface TeacherDetailProps {
  user: UserItem;
  stats: TeacherStats | null;
  statsLoading: boolean;
  isAdmin: boolean;
  onResetPassword: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function TeacherDetail({ user, stats, statsLoading, isAdmin, onResetPassword, onDelete }: TeacherDetailProps) {
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
            <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-sm">
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
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> 상세 정보 불러오는 중...
        </div>
      ) : s && (
        <>
          {/* 활동 요약 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1">
            <div className="bg-blue-50 rounded-sm p-3">
              <div className="text-xs text-blue-600 font-medium">출제 시험</div>
              <div className="text-sm font-bold text-blue-700">{s.testsCreated}개</div>
            </div>
            <div className="bg-amber-50 rounded-sm p-3">
              <div className="text-xs text-amber-600 font-medium">숙제 플랜</div>
              <div className="text-sm font-bold text-amber-700">{s.homeworkPlans}개</div>
            </div>
            <div className="bg-emerald-50 rounded-sm p-3">
              <div className="text-xs text-emerald-600 font-medium">학생 코멘트</div>
              <div className="text-sm font-bold text-emerald-700">{s.commentsWritten}건</div>
            </div>
            <div className="bg-violet-50 rounded-sm p-3">
              <div className="text-xs text-violet-600 font-medium">AI 문제 생성</div>
              <div className="text-sm font-bold text-violet-700">{s.questionsGenerated}건</div>
            </div>
          </div>

          {/* 최근 출제 시험 */}
          {stats!.recentTests.length > 0 && (
            <>
              <SectionTitle icon={ClipboardCheck} title="최근 출제 시험" />
              <div className="space-y-1.5">
                {stats!.recentTests.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-sm px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{t.title}</div>
                      <div className="text-xs text-text-secondary">
                        {gradeLabel(t.grade)} · {t.questionCount}문제 · {relativeTime(t.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2 text-xs text-text-secondary">
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
                {stats!.recentHomework.map((h) => (
                  <div key={h.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-sm px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{h.title}</div>
                      <div className="text-xs text-text-secondary">
                        {h.totalDays}일 × {h.dailyCount}문제 · {relativeTime(h.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs text-text-secondary">{h._count.enrollments}명 참여</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
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
                {stats!.recentComments.map((c, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-sm px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-primary">{c.student.name}</span>
                      <span className="text-xs text-text-secondary">{c.month}</span>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2">{c.content}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* 액션 */}
      <div className="border-t border-slate-200 pt-3 mt-4">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">액션</h3>
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
