'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  GraduationCap,
  BookOpen,
  CheckCircle,
  Circle,
  Lock,
  Loader2,
  Clock,
  Target,
  BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface StageData {
  completed: boolean;
  completedAt: string | null;
  attempts: number;
  score: number | null;
  hintCount: number;
  revealCount: number;
}

interface ConceptProgress {
  id: string;
  title: string;
  chapter: string | null;
  section: string | null;
  sortOrder: number;
  stages: Record<string, StageData | null>;
  isCompleted: boolean;
  currentStage: string;
}

interface ProgressData {
  course: { seq: number; title: string };
  student: { name: string; username: string; grade: number | null };
  enrollment: { status: string; startedAt: string | null; completedAt: string | null };
  concepts: ConceptProgress[];
  summary: { completed: number; total: number; percent: number };
}

const STAGE_META = [
  { key: 'READING', label: '읽기', color: 'text-stage-reading', bg: 'bg-blue-50', border: 'border-stage-reading' },
  { key: 'BLANK_EASY', label: '빈칸(쉬움)', color: 'text-stage-blank-easy', bg: 'bg-emerald-50', border: 'border-stage-blank-easy' },
  { key: 'BLANK_HARD', label: '빈칸(어려움)', color: 'text-stage-blank-hard', bg: 'bg-orange-50', border: 'border-stage-blank-hard' },
  { key: 'BLANK_FULL', label: '통문장', color: 'text-stage-blank-page', bg: 'bg-violet-50', border: 'border-stage-blank-page' },
];

export default function StudentProgressPage() {
  const { id, username } = useParams<{ id: string; username: string }>();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/learning-courses/${id}/progress/${username}`)
      .then((r) => r.json())
      .then((json) => setData(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-6 py-8 max-w-[1000px] mx-auto">
        <Card className="p-12 text-center">
          <p className="text-text-secondary">데이터를 찾을 수 없습니다.</p>
          <Link href={`/courses/${id}`} className="text-primary text-sm hover:underline mt-2 inline-block">
            과정으로 돌아가기
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-[1000px] mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/courses/${id}`} className="p-2 rounded-sm hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            {data.student.name}의 학습 진행
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">{data.course.title}</p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <Target className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <div className="text-2xl font-black text-primary">{data.summary.percent}%</div>
          <div className="text-xs text-text-secondary">전체 진행률</div>
        </Card>
        <Card className="p-4 text-center">
          <BookOpen className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
          <div className="text-2xl font-black text-emerald-600">{data.summary.completed}/{data.summary.total}</div>
          <div className="text-xs text-text-secondary">완료 개념</div>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
          <div className="text-sm font-bold text-text-primary">
            {data.enrollment.startedAt ? new Date(data.enrollment.startedAt).toLocaleDateString('ko-KR') : '-'}
          </div>
          <div className="text-xs text-text-secondary">시작일</div>
        </Card>
        <Card className="p-4 text-center">
          <BarChart3 className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
          <div className="text-sm font-bold text-text-primary capitalize">
            {data.enrollment.status === 'ACTIVE' ? '진행 중' : data.enrollment.status === 'COMPLETED' ? '완료' : '대기'}
          </div>
          <div className="text-xs text-text-secondary">상태</div>
        </Card>
      </div>

      {/* 전체 진행률 바 */}
      <div className="mb-6">
        <ProgressBar value={data.summary.percent} size="md" />
      </div>

      {/* 개념별 진행 */}
      <div className="flex flex-col gap-3">
        {data.concepts.map((concept, idx) => (
          <Card key={concept.id} className={`p-4 ${concept.isCompleted ? 'bg-emerald-50/30 border-emerald-200' : ''}`}>
            <div className="flex items-start gap-3">
              {/* 번호 + 완료 표시 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                concept.isCompleted
                  ? 'bg-emerald-500 text-white'
                  : concept.currentStage !== 'NOT_STARTED'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {concept.isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
              </div>

              {/* 개념 정보 + 스텝 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-text-primary text-sm">{concept.title}</span>
                  {concept.chapter && concept.chapter !== concept.title && (
                    <span className="text-xs text-text-secondary">{concept.chapter}</span>
                  )}
                </div>

                {/* 4단계 스텝 인디케이터 */}
                <div className="flex items-center gap-1">
                  {STAGE_META.map((stage, stageIdx) => {
                    const stageData = concept.stages[stage.key];
                    const isComplete = stageData?.completed === true;
                    const isActive = concept.currentStage === stage.key;

                    return (
                      <div key={stage.key} className="flex items-center">
                        {stageIdx > 0 && (
                          <div className={`w-4 h-0.5 mx-0.5 ${isComplete || isActive ? 'bg-slate-300' : 'bg-slate-100'}`} />
                        )}
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                            isComplete
                              ? `${stage.bg} ${stage.color} border ${stage.border}`
                              : isActive
                                ? 'bg-primary/10 text-primary border border-primary/30 animate-pulse'
                                : 'bg-slate-50 text-slate-300 border border-slate-100'
                          }`}
                          title={stageData?.completedAt ? `완료: ${new Date(stageData.completedAt).toLocaleDateString('ko-KR')}` : undefined}
                        >
                          {isComplete ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : isActive ? (
                            <Circle className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          {stage.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 상세 정보 (완료된 단계가 있으면) */}
                {Object.values(concept.stages).some((s) => s?.completed) && (
                  <div className="flex gap-4 mt-2 text-xs text-text-secondary">
                    {STAGE_META.map((stage) => {
                      const s = concept.stages[stage.key];
                      if (!s?.completed) return null;
                      return (
                        <span key={stage.key}>
                          {stage.label}: {s.attempts}회 시도
                          {s.completedAt && ` · ${new Date(s.completedAt).toLocaleDateString('ko-KR')}`}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
