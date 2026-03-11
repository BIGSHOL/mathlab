import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getCurrentUser } from '@/lib/auth';
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
  const stages = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_PAGE'];
  for (let i = stages.length - 1; i >= 0; i--) {
    const p = progress.find((pr) => pr.stage === stages[i]);
    if (p?.completed) return Math.min(i + 1, 4);
  }
  // Check if any stage is started but not completed
  if (progress.length > 0) {
    const stages_started = progress.map((p) => stages.indexOf(p.stage));
    return Math.max(...stages_started);
  }
  return 0;
}

function getProgressPercent(progress: Array<{ stage: string; completed: boolean }>): number {
  const completedStages = progress.filter((p) => p.completed).length;
  return Math.round((completedStages / 4) * 100);
}

export default async function SubjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const subjects = await prisma.subject.findMany({
    where: user.grade ? { gradeLevel: user.grade } : {},
    include: {
      concepts: {
        orderBy: { sortOrder: 'asc' },
        include: {
          progress: {
            where: { userId: user.id },
            select: { stage: true, completed: true },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="px-4 md:px-10 py-8 max-w-[1200px] mx-auto w-full">
      <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-2">단원 목록</h1>
      <p className="text-text-secondary mb-8">학년에 맞는 단원을 선택하여 학습을 시작하세요.</p>

      {subjects.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-text-secondary">아직 등록된 단원이 없습니다.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {subjects.map((subject) => (
            <Card key={subject.id} className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-50 rounded-sm">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{subject.title}</h2>
                  <p className="text-text-secondary text-sm">{subject.description}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {subject.concepts.map((concept) => {
                  const stageIdx = getStageIndex(concept.progress);
                  const progressPct = getProgressPercent(concept.progress);
                  return (
                    <Link key={concept.id} href={`/concepts/${concept.id}`}>
                      <div className="flex items-center gap-4 p-4 rounded-sm hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all group cursor-pointer">
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
          ))}
        </div>
      )}
    </div>
  );
}
