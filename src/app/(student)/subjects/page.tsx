import Link from 'next/link';
import { ChevronRight, GraduationCap, Lock, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import GemStone from '@/components/gamification/GemStone';
import { partToGemVariant } from '@/lib/utils/gem';
import { getCurrentUser } from '@/lib/auth';
import { getViewAsUser } from '@/lib/view-as';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

const stageLabels = ['미시작', '읽기', '빈칸(쉬움)', '빈칸(어려움)', '백지쓰기'];
const stageColors = [
  'text-slate-400',
  'text-stage-reading',
  'text-stage-blank-easy',
  'text-stage-blank-hard',
  'text-stage-blank-page',
];

function getStageIndex(progress: Array<{ stage: string; completed: boolean }>): number {
  const stages = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'];
  for (let i = stages.length - 1; i >= 0; i--) {
    const p = progress.find((pr) => pr.stage === stages[i]);
    if (p?.completed) return Math.min(i + 1, 4);
  }
  if (progress.length > 0) {
    const stages_started = progress.map((p) => stages.indexOf(p.stage));
    return Math.max(...stages_started.filter((i) => i >= 0));
  }
  return 0;
}

function getProgressPercent(progress: Array<{ stage: string; completed: boolean }>): number {
  const completedStages = progress.filter((p) => p.completed).length;
  return Math.round((completedStages / 4) * 100);
}

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ _as?: string }>;
}) {
  const realUser = await getCurrentUser();
  if (!realUser) redirect('/login');
  const user = await getViewAsUser(await searchParams) ?? realUser;

  // 배정된 학습 과정 조회
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
  const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED');
  const upcomingEnrollments = enrollments.filter((e) => e.status === 'LOCKED');
  const hasEnrollments = enrollments.length > 0;

  // 배정 과정이 없으면 빈 상태
  if (!hasEnrollments) {
    return (
      <div className="px-4 md:px-10 py-8 max-w-[1200px] mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">학습 과정</h1>
        <p className="text-text-secondary mb-8">선생님이 배정한 학습 과정을 진행합니다.</p>
        <Card className="p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-text-secondary text-lg mb-2">배정된 학습 과정이 없습니다</p>
          <p className="text-text-secondary text-sm">선생님이 학습 과정을 배정하면 여기에 표시됩니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 py-8 max-w-[1200px] mx-auto w-full">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">학습 과정</h1>
      <p className="text-text-secondary mb-8">선생님이 배정한 학습 과정을 진행합니다.</p>

      <div className="flex flex-col gap-8">
        {/* 현재 진행 중 과정 */}
        {activeEnrollment && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h2 className="text-lg font-bold text-text-primary">현재 진행 중</h2>
            </div>
            <Card className="p-6 border-2 border-primary/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-sm">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-text-primary">{activeEnrollment.course.title}</h2>
                  {activeEnrollment.course.description && (
                    <p className="text-text-secondary text-sm">{activeEnrollment.course.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {activeEnrollment.course.concepts.filter((cc) =>
                      cc.concept.progress.some((p) => p.stage === 'BLANK_FULL' && p.completed)
                    ).length}/{activeEnrollment.course.concepts.length}
                  </p>
                  <p className="text-xs text-text-secondary">완료</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {activeEnrollment.course.concepts.map((cc) => {
                  const concept = cc.concept;
                  const stageIdx = getStageIndex(concept.progress);
                  const progressPct = getProgressPercent(concept.progress);
                  return (
                    <Link key={concept.id} href={`/concepts/${concept.conceptCode ?? concept.id}`}>
                      <div className="flex items-center gap-4 p-4 rounded-sm hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all group cursor-pointer">
                        <GemStone variant={partToGemVariant(concept.part)} stage={stageIdx} size="xs" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                            {concept.title}
                          </h3>
                          <span className={`text-xs font-medium ${stageColors[stageIdx]}`}>
                            {stageLabels[stageIdx]}
                          </span>
                        </div>
                        <div className="w-32">
                          <ProgressBar value={progressPct} size="sm" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* 대기 중 과정 */}
        {upcomingEnrollments.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-slate-400" />
              <h2 className="text-lg font-bold text-text-primary">다음 과정 ({upcomingEnrollments.length})</h2>
            </div>
            <div className="flex flex-col gap-3">
              {upcomingEnrollments.map((enrollment) => (
                <Card key={enrollment.id} className="p-5 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-sm">
                      <Lock className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-text-primary">{enrollment.course.title}</h3>
                      <p className="text-xs text-text-secondary">
                        {enrollment.course.concepts.length}개 개념 · 현재 과정 완료 후 자동 해금
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 완료 과정 */}
        {completedEnrollments.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <h2 className="text-lg font-bold text-text-primary">완료된 과정 ({completedEnrollments.length})</h2>
            </div>
            <div className="flex flex-col gap-3">
              {completedEnrollments.map((enrollment) => (
                <Card key={enrollment.id} className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-text-primary">{enrollment.course.title}</h3>
                      <p className="text-xs text-text-secondary">
                        {enrollment.course.concepts.length}개 개념 완료
                        {enrollment.completedAt && ` · ${new Date(enrollment.completedAt).toLocaleDateString('ko-KR')}`}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">완료</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
