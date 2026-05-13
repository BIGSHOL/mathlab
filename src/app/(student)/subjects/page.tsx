import Link from 'next/link';
import { ChevronRight, GraduationCap, CheckCircle, BookOpen, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { getCurrentUser } from '@/lib/auth';
import { getViewAsUser } from '@/lib/view-as';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

const stageLabels = ['미시작', '읽기', '빈칸(쉬움)', '빈칸(어려움)', '완료'];

function getStageIndex(progress: Array<{ stage: string; completed: boolean }>): number {
  const stages = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'];
  for (let i = stages.length - 1; i >= 0; i--) {
    const p = progress.find((pr) => pr.stage === stages[i]);
    if (p?.completed) return Math.min(i + 1, 4);
  }
  if (progress.length > 0) {
    const started = progress.map((p) => stages.indexOf(p.stage));
    return Math.max(...started.filter((i) => i >= 0));
  }
  return 0;
}

function getProgressPercent(progress: Array<{ stage: string; completed: boolean }>): number {
  const stages = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'];
  for (let i = stages.length - 1; i >= 0; i--) {
    if (progress.some((p) => p.stage === stages[i] && p.completed)) {
      return Math.round(((i + 1) / 4) * 100);
    }
  }
  if (progress.length > 0) return 5;
  return 0;
}

function getDotState(pct: number, completed: boolean): 'ok' | 'warn' | 'bad' | 'pending' {
  if (completed) return 'ok';
  if (pct >= 75) return 'ok';
  if (pct >= 50) return 'warn';
  if (pct > 0) return 'bad';
  return 'pending';
}

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ _as?: string; c?: string }>;
}) {
  const realUser = await getCurrentUser();
  if (!realUser) redirect('/login');
  const sp = await searchParams;
  const user = await getViewAsUser(sp) ?? realUser;

  const enrollments = await prisma.learningCourseEnrollment.findMany({
    where: { studentId: user.id },
    include: {
      course: {
        include: {
          concepts: {
            orderBy: { sortOrder: 'asc' },
            include: {
              concept: {
                include: {
                  subject: true,
                  progress: {
                    where: { userId: user.id },
                    select: { stage: true, completed: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const activeEnrollment = enrollments.find((e) => e.status === 'ACTIVE');
  const isSequential = activeEnrollment?.course.mode === 'sequential';
  const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED');
  const upcomingEnrollments = enrollments.filter((e) => e.status === 'LOCKED');
  const hasEnrollments = enrollments.length > 0;

  // 활성 과정이 없을 때 최근 학습한 개념 조회
  const recentProgress = !activeEnrollment ? await prisma.learningProgress.findMany({
    where: { userId: user.id },
    include: {
      concept: {
        include: {
          subject: true,
          progress: { where: { userId: user.id }, select: { stage: true, completed: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 12,
  }) : [];

  const uniqueRecentConcepts = recentProgress.filter(
    (p, i, arr) => arr.findIndex((x) => x.conceptId === p.conceptId) === i
  );

  // 빈 상태
  if (!hasEnrollments) {
    return (
      <PageContainer maxWidth="lg">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-emerald-400/60" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center border-2 border-white">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">아직 배정된 학습 과정이 없어요</h3>
          <p className="text-sm text-text-secondary text-center max-w-xs leading-relaxed">
            선생님이 학습 과정을 배정하면 여기에 표시됩니다.<br />
            개념을 읽고, 빈칸을 채우며 단계별로 마스터해보세요!
          </p>
          <div className="flex gap-3 mt-6">
            <Link href="/practice/arithmetic">
              <Button variant="secondary" size="sm">
                연산 연습하기
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  // 활성 과정의 개념 통계
  const activeConceptCount = activeEnrollment?.course.concepts.length ?? 0;
  const activeCompletedCount = activeEnrollment?.course.concepts.filter((cc) =>
    cc.concept.progress.some((p) => p.stage === 'BLANK_FULL' && p.completed)
  ).length ?? 0;

  // 활성 과정의 "이어서 학습" 링크 — 미완료 첫 개념
  const nextConcept = activeEnrollment?.course.concepts.find(
    (cc) => !cc.concept.progress.some((p) => p.stage === 'BLANK_FULL' && p.completed)
  );

  // URL ?c 파라미터로 선택된 개념. 없으면 nextConcept.
  const selectedConceptId = sp.c;
  const selectedCC = activeEnrollment?.course.concepts.find(
    (cc) => cc.concept.id === selectedConceptId || cc.concept.conceptCode === selectedConceptId
  ) ?? nextConcept ?? activeEnrollment?.course.concepts[0];
  const selectedConcept = selectedCC?.concept;

  const buildQ = (conceptKey: string) => {
    const base = new URLSearchParams();
    if (sp._as) base.set('_as', sp._as);
    base.set('c', conceptKey);
    return `?${base.toString()}`;
  };

  return (
    <PageContainer maxWidth="xl">
      <div className="mc-frame">
        <div className="mc-topbar">
          <span className="title">단원 학습</span>
          {activeEnrollment ? (
            <span className="meta">
              {activeEnrollment.course.title} · {activeCompletedCount}/{activeConceptCount} 완료
              {isSequential && ' · 순차 학습'}
            </span>
          ) : (
            <span className="meta">활성 과정 없음 · 최근 학습한 개념 표시 중</span>
          )}
          <div className="sp" />
          {nextConcept && (
            <Link
              href={`/concepts/${nextConcept.concept.conceptCode ?? nextConcept.concept.id}`}
              className="mc-btn primary"
            >
              ▶ 이어서 학습
            </Link>
          )}
        </div>

        <div className="mc-v1" style={{ gridTemplateColumns: '300px 1fr' }}>
          {/* 좌측 트리 */}
          <aside className="mc-v1-tree">
            {/* 활성 과정 */}
            {activeEnrollment && (
              <>
                <div className="mc-tree-grade">
                  진행 중
                </div>
                <div className="mc-tree-node" style={{ fontWeight: 700 }}>
                  <span className="ic">▾</span>
                  <span>{activeEnrollment.course.title}</span>
                  <span className="pct">
                    {activeConceptCount > 0
                      ? Math.round((activeCompletedCount / activeConceptCount) * 100)
                      : 0}
                    %
                  </span>
                </div>
                {activeEnrollment.course.concepts.map((cc, idx) => {
                  const concept = cc.concept;
                  const pct = getProgressPercent(concept.progress);
                  const isCompleted = concept.progress.some(
                    (p) => p.stage === 'BLANK_FULL' && p.completed
                  );
                  let isLocked = false;
                  if (isSequential && !isCompleted && idx > 0) {
                    const prev = activeEnrollment.course.concepts[idx - 1].concept;
                    isLocked = !prev.progress.some(
                      (p) => p.stage === 'BLANK_FULL' && p.completed
                    );
                  }
                  const isActive =
                    selectedConcept?.id === concept.id ||
                    selectedConcept?.conceptCode === concept.conceptCode;
                  const dot = getDotState(pct, isCompleted);
                  const nodeKey = concept.conceptCode ?? concept.id;

                  if (isLocked) {
                    return (
                      <div
                        key={concept.id}
                        className="mc-tree-node mc-tree-l1 locked"
                        title="이전 개념을 완료해야 합니다"
                      >
                        <span className="ic">🔒</span>
                        <span>{concept.title}</span>
                        <span className="pct">잠금</span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={concept.id}
                      href={buildQ(nodeKey)}
                      className={`mc-tree-node mc-tree-l1${isActive ? ' active' : ''}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <span className={`dot ${dot}`} />
                      <span>{concept.title}</span>
                      <span className="pct">{isCompleted ? '완료' : `${pct}%`}</span>
                    </Link>
                  );
                })}
              </>
            )}

            {/* 다음 과정 */}
            {upcomingEnrollments.length > 0 && (
              <>
                <div className="mc-tree-grade">다음 과정</div>
                {upcomingEnrollments.map((e) => (
                  <div key={e.id} className="mc-tree-node locked">
                    <span className="ic">🔒</span>
                    <span>{e.course.title}</span>
                    <span className="pct">{e.course.concepts.length}</span>
                  </div>
                ))}
              </>
            )}

            {/* 완료 과정 */}
            {completedEnrollments.length > 0 && (
              <>
                <div className="mc-tree-grade">완료</div>
                {completedEnrollments.map((e) => (
                  <div key={e.id} className="mc-tree-node">
                    <span className="ic" style={{ color: 'var(--success)' }}>
                      ✓
                    </span>
                    <span>{e.course.title}</span>
                    <span className="pct" style={{ color: 'var(--success)' }}>완료</span>
                  </div>
                ))}
              </>
            )}

            {/* 활성 과정 없을 때: 최근 학습한 개념 */}
            {!activeEnrollment && uniqueRecentConcepts.length > 0 && (
              <>
                <div className="mc-tree-grade">최근 학습</div>
                {uniqueRecentConcepts.map((p) => {
                  const pct = getProgressPercent(p.concept.progress);
                  const isCompleted = p.concept.progress.some(
                    (pr) => pr.stage === 'BLANK_FULL' && pr.completed
                  );
                  const isActive =
                    selectedConcept?.id === p.concept.id ||
                    selectedConcept?.conceptCode === p.concept.conceptCode;
                  const dot = getDotState(pct, isCompleted);
                  const nodeKey = p.concept.conceptCode ?? p.conceptId;
                  return (
                    <Link
                      key={p.id}
                      href={buildQ(nodeKey)}
                      className={`mc-tree-node mc-tree-l1${isActive ? ' active' : ''}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <span className={`dot ${dot}`} />
                      <span>{p.concept.title}</span>
                      <span className="pct">{isCompleted ? '완료' : `${pct}%`}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </aside>

          {/* 우측 디테일 */}
          <div className="mc-v1-detail">
            {selectedConcept ? (
              <>
                <div className="mc-detail-breadcrumb">
                  {activeEnrollment ? (
                    <>
                      {activeEnrollment.course.title} · <b>{selectedConcept.title}</b>
                    </>
                  ) : (
                    <>
                      {selectedConcept.subject?.title} · <b>{selectedConcept.title}</b>
                    </>
                  )}
                </div>
                <h2 className="mc-detail-title">{selectedConcept.title}</h2>
                <div className="mc-detail-sub">
                  {selectedConcept.subject?.title}
                  {selectedConcept.part && ` · ${selectedConcept.part}`}
                </div>

                {(() => {
                  const stageIdx = getStageIndex(selectedConcept.progress);
                  const pct = getProgressPercent(selectedConcept.progress);
                  const isCompleted = selectedConcept.progress.some(
                    (p) => p.stage === 'BLANK_FULL' && p.completed
                  );
                  return (
                    <div className="mc-detail-kpis">
                      <div className="k">
                        <div className="lb">진도</div>
                        <div className="v" style={{ color: isCompleted ? 'var(--success)' : undefined }}>
                          {pct}%
                        </div>
                      </div>
                      <div className="k">
                        <div className="lb">현재 단계</div>
                        <div className="v" style={{ fontSize: 16 }}>
                          {stageLabels[stageIdx]}
                        </div>
                      </div>
                      <div className="k">
                        <div className="lb">완료 단계</div>
                        <div className="v">
                          {selectedConcept.progress.filter((p) => p.completed).length}/4
                        </div>
                      </div>
                      <div className="k">
                        <div className="lb">상태</div>
                        <div className="v" style={{ fontSize: 16, color: isCompleted ? 'var(--success)' : undefined }}>
                          {isCompleted ? '✓ 완료' : '진행 중'}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="mc-section-h">📘 학습 5단계</div>
                {[
                  { stage: 'READING', label: '읽기', desc: '개념 본문을 정독하며 메모', xp: '+5 EXP' },
                  { stage: 'BLANK_EASY', label: '빈칸 (쉬움)', desc: '핵심 용어 채우기', xp: '+10 EXP' },
                  { stage: 'BLANK_HARD', label: '빈칸 (어려움)', desc: '확장된 빈칸 채우기', xp: '+15 EXP' },
                  { stage: 'BLANK_FULL', label: '통문장 암기', desc: '전체 빈칸 챌린지', xp: '+20 EXP' },
                ].map((s) => {
                  const p = selectedConcept.progress.find((pr) => pr.stage === s.stage);
                  const done = p?.completed === true;
                  return (
                    <div
                      key={s.stage}
                      className="mc-concept-block"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: done ? 'var(--success-bg)' : undefined,
                        borderColor: done ? 'var(--success)' : undefined,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: done ? 'var(--success)' : 'var(--bg-2)',
                          border: done ? 'none' : '1.5px solid var(--line)',
                          color: done ? '#fff' : 'var(--ink-3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {done ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="ttl">
                          {s.label}{' '}
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', marginLeft: 6 }}>
                            {s.xp}
                          </span>
                        </div>
                        <div className="desc">{s.desc}</div>
                      </div>
                      <span
                        className={`mc-chip${done ? ' success' : ''}`}
                        style={{ fontSize: 11 }}
                      >
                        {done ? '완료' : '진행 가능'}
                      </span>
                    </div>
                  );
                })}

                <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                  <Link
                    href={`/concepts/${selectedConcept.conceptCode ?? selectedConcept.id}`}
                    className="mc-btn primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    ▶ 학습 시작
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
                <p>왼쪽에서 학습할 개념을 선택하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 완료 과정 요약 카드 (트리 아래) */}
      {completedEnrollments.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <h2 className="text-base font-bold text-text-primary">
              완료된 과정 ({completedEnrollments.length})
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {completedEnrollments.map((enrollment) => (
              <Card key={enrollment.id} padding="md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-sm">
                    <GraduationCap className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-text-primary">{enrollment.course.title}</h3>
                    <p className="text-xs text-text-secondary">
                      {enrollment.course.concepts.length}개 개념 완료
                      {enrollment.completedAt &&
                        ` · ${new Date(enrollment.completedAt).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    완료
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
