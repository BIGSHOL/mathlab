'use client';

/**
 * 내신대비 캠페인 활동 문제 풀이 페이지
 *
 * /exam-prep/[enrollmentId]/solve?day=N&act=M
 *
 * - questions / mock_test / review 활동의 문제를 일괄 렌더
 * - 학생 답안 입력 → 제출 시 정오답 채점 → 오답 SpacedReviewItem 자동 등록 + 활동 완료
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Send, Timer } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { MathRenderer } from '@/components/math/MathRenderer';

interface QuestionItem {
  id: string;
  content: string;
  type: string; // MULTIPLE_CHOICE | SHORT_ANSWER | ESSAY
  choices: unknown;
  answer: string;
  explanation: string | null;
  difficulty: string;
  chapter: string | null;
  section: string | null;
}

interface ActivityPayload {
  campaignTitle: string;
  activityTitle: string;
  activityType: 'concept' | 'questions' | 'mock_test' | 'review';
  phase: number;
  completed?: boolean;
  skipped?: boolean;
  questions: QuestionItem[];
}

export default function CampaignSolvePage() {
  const params = useParams<{ enrollmentId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId;
  const dayIndex = Number(search.get('day'));
  const activityIndex = Number(search.get('act'));

  const [data, setData] = useState<ActivityPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/exam-campaigns/enrollments/${enrollmentId}/activity-questions?day=${dayIndex}&act=${activityIndex}`,
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.data);
    } catch {
      toast.error('활동을 불러오지 못했습니다');
    }
    setLoading(false);
  }, [enrollmentId, dayIndex, activityIndex]);

  useEffect(() => {
    if (Number.isFinite(dayIndex) && Number.isFinite(activityIndex)) fetchData();
  }, [fetchData, dayIndex, activityIndex]);

  const elapsedMin = Math.floor((Date.now() - startedAt) / 60000);

  const allAnswered = useMemo(() => {
    if (!data) return false;
    return data.questions.every((q) => (answers[q.id] ?? '').trim().length > 0);
  }, [data, answers]);

  const handleSubmit = useCallback(async () => {
    if (!data) return;
    if (!allAnswered) {
      toast.warning('모든 문제에 답을 입력하세요');
      return;
    }
    setSubmitting(true);

    // 채점 (클라이언트) — 보기/단답 정답 비교
    const wrongQuestionIds: string[] = [];
    const resultMap: Record<string, boolean> = {};
    let correct = 0;
    for (const q of data.questions) {
      const user = (answers[q.id] ?? '').trim();
      const truth = (q.answer ?? '').trim();
      const ok = normalizeAnswer(user) === normalizeAnswer(truth);
      resultMap[q.id] = ok;
      if (ok) correct += 1;
      else wrongQuestionIds.push(q.id);
    }
    setSubmitted(resultMap);
    setResult({ correct, total: data.questions.length });

    try {
      const res = await fetch(`/api/exam-campaigns/enrollments/${enrollmentId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayIndex,
          activityIndex,
          wrongQuestionIds,
          correctCount: correct,
          totalCount: data.questions.length,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`제출 완료 — ${correct}/${data.questions.length}`);
    } catch {
      toast.error('진도 반영 실패 (답안은 채점됨)');
    }
    setSubmitting(false);
  }, [data, answers, allAnswered, enrollmentId, dayIndex, activityIndex]);

  if (loading) {
    return (
      <PageContainer maxWidth="lg">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer maxWidth="lg">
        <div className="py-20 text-center text-slate-500">활동을 찾을 수 없습니다</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => router.push('/exam-prep')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" /> 내신대비로
        </button>
      </div>
      <PageHeader
        title={data.activityTitle}
        subtitle={`${data.campaignTitle} · Phase ${data.phase}`}
      />

      {/* 진행 바 */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <span>총 {data.questions.length}문제</span>
        <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> 경과 {elapsedMin}분</span>
      </div>

      {data.questions.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-6 text-center text-sm text-amber-700">
          {data.activityType === 'review'
            ? '아직 등록된 오답이 없습니다. 문제를 풀면 자동으로 누적됩니다.'
            : '이 활동에는 배정된 문제가 없습니다.'}
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={() => router.push('/exam-prep')}>돌아가기</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.questions.map((q, idx) => {
            const userAns = answers[q.id] ?? '';
            const isGraded = q.id in submitted;
            const ok = submitted[q.id];
            const choices = Array.isArray(q.choices) ? (q.choices as string[]) : [];
            return (
              <div
                key={q.id}
                className={`bg-white border rounded-sm p-4 ${
                  isGraded ? (ok ? 'border-green-300' : 'border-red-300') : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">
                      {idx + 1}
                    </span>
                    {q.chapter && <span className="text-[11px] text-slate-400">{q.chapter}</span>}
                    <span className="text-[11px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                      {q.difficulty}
                    </span>
                  </div>
                  {isGraded && (ok ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ))}
                </div>

                <div className="text-sm mb-3">
                  <MathRenderer content={q.content} />
                </div>

                {/* 보기 */}
                {choices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {choices.map((c, i) => {
                      const val = String(i + 1);
                      const selected = userAns === val;
                      return (
                        <button
                          key={i}
                          disabled={isGraded}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                          className={`flex items-start gap-2 px-3 py-2 rounded-sm border text-left text-sm transition ${
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 bg-white hover:border-primary/50'
                          } ${isGraded ? 'cursor-default' : ''}`}
                        >
                          <span className="text-slate-500 font-medium">{['①','②','③','④','⑤'][i] ?? i + 1}</span>
                          <div className="flex-1"><MathRenderer content={c} /></div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    disabled={isGraded}
                    value={userAns}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="답을 입력하세요"
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm disabled:bg-slate-50"
                  />
                )}

                {isGraded && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-sm text-xs space-y-1">
                    <div>정답: <span className="font-semibold">{q.answer}</span> {!ok && `(내 답: ${userAns || '—'})`}</div>
                    {q.explanation && (
                      <div className="text-slate-600 mt-1"><MathRenderer content={q.explanation} /></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* 제출 바 */}
          {!result ? (
            <div className="sticky bottom-0 bg-white border-t border-slate-200 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                답안 {Object.values(answers).filter((v) => v.trim()).length}/{data.questions.length}
              </span>
              <Button onClick={handleSubmit} disabled={submitting || !allAnswered}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 제출 중…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> 제출하고 채점</>
                )}
              </Button>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-sm p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-primary">
                  {result.correct}/{result.total} 정답 ({Math.round((result.correct / result.total) * 100)}%)
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  틀린 문제는 에빙하우스 복습 스케줄에 자동 등록되었습니다.
                </p>
              </div>
              <Button variant="secondary" onClick={() => router.push('/exam-prep')}>돌아가기</Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

/** 주관식 답안 정규화 (공백, 수식 괄호 등 제거) */
function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, '').replace(/[$]/g, '').toLowerCase();
}
