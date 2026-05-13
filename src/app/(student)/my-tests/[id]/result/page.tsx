/**
 * /my-tests/[id]/result — Pattern B V1 (점수 영웅) 적용.
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1
 *
 * 매니페스트 §C1 — 디자인이 정답.
 * §M3 — 데이터 fetch 로직 유지, 마크업/스타일만 교체.
 *
 * V1 시안 외 보존 기능 (학생 실사용에 필요):
 *   - 레벨테스트면 LevelTestResultCard
 *   - 응시 이력 (Multi-attempt) — main 하단에 단원 막대 형식으로 표시
 */
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { MathRenderer } from '@/components/math/MathRenderer';
import { LevelTestResultCard } from '@/components/level-test/LevelTestResultCard';
import {
  ResultReportLayout,
  HeroScore,
  KpiGrid,
  UnitBars,
  WrongList,
  AICommentary,
  RewardBox,
  NextActions,
  type KpiItem,
  type UnitAccuracy,
  type WrongItem,
  type RewardItem,
  type NextAction,
} from '@/components/result-report';

interface AnswerDetail {
  questionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  comboCount: number;
  pointsEarned: number;
  selectedAnswer: string;
  hintUsed?: boolean;
}

interface QuestionInfo {
  id: string;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
  difficulty: string;
  chapter: string;
  questionNum: number;
  domain?: string | null;
}

interface AttemptHistory {
  id: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
  xpEarned: number;
}

// 정답률 → 학점 등급 라벨
function gradeFromAccuracy(pct: number): string {
  if (pct >= 95) return 'S';
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

function fmtMmSs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function TestResultPage() {
  const { id: testSeq } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<{
    score: number;
    maxScore: number;
    correctCount: number;
    totalCount: number;
    xpEarned: number;
    comboMax: number;
    attemptNumber: number;
    answers: AnswerDetail[];
    questionOrder?: string[];
    test: { title: string; maxAttempts: number | null; testType: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    diagnosticResult: any | null;
  } | null>(null);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [attemptHistory, setAttemptHistory] = useState<AttemptHistory[]>([]);
  const [canRetake, setCanRetake] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // 3개 API 병렬 호출 (기존 흐름 유지)
        const [testRes, testsRes, histRes] = await Promise.all([
          fetch(`/api/tests/${testSeq}`),
          fetch('/api/tests'),
          fetch(`/api/tests/${testSeq}/attempts`),
        ]);

        if (testRes.ok) {
          const testJson = await testRes.json();
          setQuestions(testJson.data.questions ?? []);
        }

        if (testsRes.ok) {
          const testsJson = await testsRes.json();
          const test = testsJson.data?.find((t: { seq: number }) => String(t.seq) === testSeq);
          if (test) {
            const attemptCount = test.attemptCount ?? 0;
            const maxAttempts = test.maxAttempts;
            setCanRetake(maxAttempts === null || attemptCount < maxAttempts);
          }
        }

        if (histRes.ok) {
          const histJson = await histRes.json();
          const completedAttempts = (histJson.data ?? []).filter((a: AttemptHistory) => a.completedAt);
          setAttemptHistory(completedAttempts);

          if (completedAttempts.length > 0) {
            const latestAttemptId = completedAttempts[0].id;
            const detailRes = await fetch(`/api/tests/attempts/${latestAttemptId}`);
            if (detailRes.ok) {
              const detailJson = await detailRes.json();
              setAttempt(detailJson.data);
            }
          }
        }
      } catch {
        toast.error('시험 결과를 불러오는데 실패했습니다.');
      }
      setLoading(false);
    }
    load();
  }, [testSeq]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <div className="rr-frame">
          <div className="rr-topbar">
            <Skeleton className="h-4 w-5" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="rr-v1">
            <div className="rr-v1-main">
              <Skeleton className="h-44 w-full" />
              <div className="rr-kpi-grid">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
            <aside className="rr-v1-side">
              <Skeleton className="h-28 w-full mb-4" />
              <Skeleton className="h-40 w-full mb-4" />
              <Skeleton className="h-36 w-full" />
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (!attempt) {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">결과를 찾을 수 없습니다</p>
        <Link
          href="/my-tests"
          className="inline-flex items-center gap-1 px-4 py-2 border border-slate-200 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          시험 목록으로
        </Link>
      </div>
    );
  }

  // ── 데이터 가공 ──
  const accuracy =
    attempt.totalCount > 0 ? Math.round((attempt.correctCount / attempt.totalCount) * 100) : 0;
  const totalTime = attempt.answers.reduce((s, a) => s + a.timeSpentSeconds, 0);
  const avgTime = attempt.totalCount > 0 ? Math.round(totalTime / attempt.totalCount) : 0;
  const grade = gradeFromAccuracy(accuracy);
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const orderedAnswers = attempt.questionOrder?.length
    ? attempt.questionOrder
        .map((qId) => attempt.answers.find((a) => a.questionId === qId))
        .filter((a): a is AnswerDetail => !!a)
    : attempt.answers;

  // UnitBars — questions.chapter 기준 그룹화
  const unitMap = new Map<string, { correct: number; total: number }>();
  for (const ans of orderedAnswers) {
    const q = questionMap.get(ans.questionId);
    if (!q) continue;
    const chapter = q.chapter || '기타';
    const u = unitMap.get(chapter) ?? { correct: 0, total: 0 };
    u.total += 1;
    if (ans.isCorrect) u.correct += 1;
    unitMap.set(chapter, u);
  }
  const units: UnitAccuracy[] = Array.from(unitMap.entries())
    .map(([name, v]) => ({ name, correct: v.correct, total: v.total }))
    .sort((a, b) => {
      const pa = a.total > 0 ? a.correct / a.total : 0;
      const pb = b.total > 0 ? b.correct / b.total : 0;
      return pb - pa; // 정답률 높은 순
    });

  // WrongList
  const wrongItems: WrongItem[] = orderedAnswers
    .filter((a) => !a.isCorrect)
    .map((a, idx) => {
      const q = questionMap.get(a.questionId);
      return {
        num: q?.questionNum ?? idx + 1,
        content: q ? <MathRenderer content={q.content.slice(0, 80)} inline /> : '문제 정보 없음',
        topic: q?.chapter,
        mine: a.selectedAnswer ? (
          <MathRenderer content={a.selectedAnswer.slice(0, 40)} inline />
        ) : (
          '미응답'
        ),
        real: q?.answer ? <MathRenderer content={q.answer.slice(0, 40)} inline /> : '—',
      };
    });

  // KPI 4-column
  const kpis: KpiItem[] = [
    { label: '정답', value: attempt.correctCount, sub: `/${attempt.totalCount}` },
    { label: '소요 시간', value: Math.floor(totalTime / 60), sub: '분' },
    { label: '평균 풀이', value: fmtMmSs(avgTime), delta: '문항당' },
    {
      label: '최대 콤보',
      value: attempt.comboMax || 0,
      delta: attempt.comboMax > 0 ? '✓ 연속 정답' : '—',
      deltaTone: attempt.comboMax > 0 ? 'up' : 'neutral',
    },
  ];

  // Hero meta — 시안엔 반평균/전국 있지만 API에 없으니 정답률/XP 로 대체
  const heroMeta = [
    { label: '정답률', value: `${accuracy}%` },
    { label: '획득 XP', value: `+${attempt.xpEarned}` },
  ];

  // Reward — 시안의 GEM/EXP/POINT/연속 → 우리 데이터로 매핑
  const rewards: RewardItem[] = [
    { label: '⭐ EXP', value: `+${attempt.xpEarned}` },
    { label: '🎯 정답', value: `${attempt.correctCount}/${attempt.totalCount}` },
    { label: '🔥 최대 콤보', value: attempt.comboMax || 0 },
    { label: '⏱ 시간', value: `${Math.floor(totalTime / 60)}분` },
  ];

  // AI commentary — 규칙 기반 (서버 AI 호출 없음)
  const weakUnits = units.filter((u) => u.total > 0 && u.correct / u.total < 0.7);
  let aiComment: ReactNode;
  if (accuracy >= 90) {
    aiComment = (
      <>
        훌륭한 결과예요! 핵심 단원 대부분이 안정적입니다. 다음 단계 심화 문제에 도전해 보세요.
      </>
    );
  } else if (weakUnits.length > 0) {
    aiComment = (
      <>
        <b>{weakUnits.slice(0, 2).map((u) => u.name).join(', ')}</b>에서 정답률이 낮습니다. 해당 단원을 집중 복습한 뒤 비슷한 시험을 한 번 더 풀면 점수가 크게 오를 거예요.
      </>
    );
  } else {
    aiComment = <>전반적으로 균형 있는 풀이였어요. 풀이 시간을 좀 더 줄이면서 정답률을 유지하는 연습을 해보세요.</>;
  }

  // NextActions
  const actions: NextAction[] = [];
  if (canRetake) {
    actions.push({ label: '다시 풀기', primary: true, href: `/my-tests/${testSeq}/play` });
  }
  if (wrongItems.length > 0) {
    actions.push({ label: `오답 ${wrongItems.length}문항 확인`, href: '#wrong-list' });
  }
  if (attemptHistory.length > 1) {
    actions.push({ label: `응시 이력 ${attemptHistory.length}회`, href: '#attempt-history' });
  }
  actions.push({ label: '시험 목록으로', href: '/my-tests' });

  // Topbar 메타
  const completedAt = attemptHistory[0]?.completedAt;
  const metaText = completedAt
    ? `${new Date(completedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })} 응시${attempt.attemptNumber > 1 ? ` · ${attempt.attemptNumber}회차` : ''}`
    : null;
  const isLevelTest = attempt.test?.testType === 'level_test';

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <ResultReportLayout
        backHref="/my-tests"
        title={attempt.test?.title ?? '시험 결과'}
        meta={metaText}
        topbarActions={
          canRetake ? (
            <Link href={`/my-tests/${testSeq}/play`} className="btn primary">
              다시 풀기
            </Link>
          ) : null
        }
        main={
          <>
            <HeroScore
              kicker={isLevelTest ? '진단 결과' : '최종 점수'}
              title={
                accuracy >= 90
                  ? '잘했어요!'
                  : accuracy >= 70
                    ? '괜찮은 결과예요'
                    : '복습이 필요해요'
              }
              score={attempt.score}
              total={attempt.maxScore}
              grade={grade}
              meta={heroMeta}
            />

            <KpiGrid items={kpis} />

            {units.length > 0 && (
              <div>
                <div className="rr-section-h">
                  <h3>단원별 정답률</h3>
                  <span className="sub">{units.length}개 단원</span>
                </div>
                <UnitBars units={units} />
              </div>
            )}

            {wrongItems.length > 0 && (
              <div id="wrong-list">
                <div className="rr-section-h">
                  <h3>오답 문항 ({wrongItems.length})</h3>
                  <span className="sub">복습 권장</span>
                </div>
                <WrongList items={wrongItems} />
              </div>
            )}

            {/* 레벨테스트 결과 (V1 시안 외 보존) */}
            {isLevelTest && attempt.diagnosticResult && (
              <div>
                <div className="rr-section-h">
                  <h3>진단 결과 상세</h3>
                </div>
                <LevelTestResultCard
                  recommendLevel={attempt.diagnosticResult.recommendLevel}
                  overallAccuracy={attempt.diagnosticResult.overallAccuracy}
                  domainScores={attempt.diagnosticResult.domainScores ?? {}}
                  weakAreas={attempt.diagnosticResult.weakAreas ?? []}
                  strongAreas={attempt.diagnosticResult.strongAreas ?? []}
                  answers={attempt.answers}
                  questions={questions}
                />
              </div>
            )}

            {/* 응시 이력 (V1 시안 외 보존) */}
            {attemptHistory.length > 1 && (
              <div id="attempt-history">
                <div className="rr-section-h">
                  <h3>응시 이력</h3>
                  <span className="sub">{attemptHistory.length}회</span>
                </div>
                <div className="rr-unit-list">
                  {attemptHistory.map((h) => {
                    const pct =
                      h.totalCount > 0 ? Math.round((h.correctCount / h.totalCount) * 100) : 0;
                    const klass = pct < 60 ? 'bad' : pct < 80 ? 'warn' : '';
                    return (
                      <div key={h.id} className={`rr-unit-row ${klass}`}>
                        <div className="name">{h.attemptNumber}회차</div>
                        <div className="bar-wrap">
                          <div className="bar" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="pct">{pct}%</div>
                        <div className="ratio">
                          {h.score}/{h.maxScore}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        }
        side={
          <>
            <AICommentary>{aiComment}</AICommentary>
            <RewardBox items={rewards} />
            <NextActions items={actions} />
          </>
        }
      />
    </div>
  );
}
