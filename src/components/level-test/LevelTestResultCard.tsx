'use client';

import { useState, useMemo } from 'react';
import { LevelBadge } from './LevelBadge';
import { DomainScoreBar } from './DomainScoreBar';
import { RadarChart } from './RadarChart';
import { DifficultyBreakdown } from './DifficultyBreakdown';
import { ChapterMasteryGrid } from './ChapterMasteryGrid';
import { QuestionResultTable } from './QuestionResultTable';
import type { LevelTestDomain } from '@/types';
import { GitBranch, ChevronDown, ChevronUp, BarChart3, BookOpen, ListChecks, Target, Radar } from 'lucide-react';

interface DomainScore {
  total: number;
  correct: number;
  accuracy: number;
}

interface AreaInfo {
  chapter: string;
  accuracy: number;
  total: number;
  correct: number;
}

interface PrerequisiteWeakness {
  conceptCode: string;
  conceptTitle: string;
  relatedChapter: string;
}

interface AnswerData {
  questionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  selectedAnswer: string;
}

interface QuestionData {
  id: string;
  chapter: string;
  difficulty: string;
  domain?: string | null;
  answer: string;
  questionNum: number;
}

interface LevelTestResultCardProps {
  recommendLevel: string;
  overallAccuracy: number;
  domainScores: Record<string, DomainScore>;
  weakAreas: AreaInfo[];
  strongAreas?: AreaInfo[];
  /** 문항 상세 데이터 (있으면 확장 뷰 활성화) */
  answers?: AnswerData[];
  questions?: QuestionData[];
}

const DOMAIN_ORDER: LevelTestDomain[] = ['CALCULATION', 'UNDERSTANDING', 'PROBLEM_SOLVING', 'REASONING'];

type Section = 'domain' | 'difficulty' | 'chapter' | 'questions' | 'prerequisite';

export function LevelTestResultCard({
  recommendLevel,
  overallAccuracy,
  domainScores,
  weakAreas,
  strongAreas,
  answers,
  questions,
}: LevelTestResultCardProps) {
  const [expanded, setExpanded] = useState<Record<Section, boolean>>({
    domain: true,
    difficulty: true,
    chapter: true,
    questions: false,
    prerequisite: true,
  });

  const hasDetail = answers && questions && answers.length > 0;

  // 라다 차트 데이터
  const radarData = useMemo(
    () =>
      DOMAIN_ORDER.map((domain) => ({
        domain,
        value: domainScores[domain]?.accuracy ?? 0,
      })),
    [domainScores]
  );

  // 난이도별 통계 (상세 데이터 있을 때)
  const difficultyStats = useMemo(() => {
    if (!hasDetail) return [];
    const qMap = new Map(questions.map((q) => [q.id, q]));
    const stats: Record<string, { total: number; correct: number }> = {};
    for (const ans of answers) {
      const q = qMap.get(ans.questionId);
      if (!q) continue;
      if (!stats[q.difficulty]) stats[q.difficulty] = { total: 0, correct: 0 };
      stats[q.difficulty].total++;
      if (ans.isCorrect) stats[q.difficulty].correct++;
    }
    const order = ['BASIC', 'MEDIUM', 'HIGH', 'HIGHEST'];
    return order
      .filter((d) => stats[d])
      .map((d) => ({
        difficulty: d,
        total: stats[d].total,
        correct: stats[d].correct,
        accuracy: stats[d].total > 0 ? Math.round((stats[d].correct / stats[d].total) * 100) : 0,
      }));
  }, [hasDetail, answers, questions]);

  // 단원별 통계 (상세 데이터 있을 때)
  const chapterStats = useMemo(() => {
    if (!hasDetail) return [];
    const qMap = new Map(questions.map((q) => [q.id, q]));
    const stats: Record<string, { total: number; correct: number }> = {};
    for (const ans of answers) {
      const q = qMap.get(ans.questionId);
      if (!q) continue;
      if (!stats[q.chapter]) stats[q.chapter] = { total: 0, correct: 0 };
      stats[q.chapter].total++;
      if (ans.isCorrect) stats[q.chapter].correct++;
    }
    return Object.entries(stats).map(([name, s]) => ({
      name,
      total: s.total,
      correct: s.correct,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));
  }, [hasDetail, answers, questions]);

  // 계통도 선수학습 취약점
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prereqWeaknesses = (domainScores as any)?._prerequisiteWeaknesses as PrerequisiteWeakness[] | undefined;

  const toggle = (section: Section) =>
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));

  const SectionHeader = ({
    section,
    icon: Icon,
    title,
    badge,
  }: {
    section: Section;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    badge?: string;
  }) => (
    <button
      onClick={() => toggle(section)}
      className="w-full flex items-center justify-between py-2 group"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-text-primary">{title}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-sm font-medium">
            {badge}
          </span>
        )}
      </div>
      {expanded[section] ? (
        <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
      ) : (
        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* === Hero: 레벨 판정 카드 === */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-sm border border-indigo-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">학력 수준 판정</p>
            <LevelBadge level={recommendLevel} size="lg" />
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-indigo-600">{overallAccuracy}%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              전체 정답률
              {hasDetail && (
                <span className="ml-1 text-slate-400">
                  ({answers.filter((a) => a.isCorrect).length}/{answers.length})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* === 섹션 1: 4대 영역 분석 (레이더 + 바) === */}
      <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
        <div className="px-4 border-b border-slate-100">
          <SectionHeader section="domain" icon={Radar} title="4대 영역 분석" />
        </div>
        {expanded.domain && (
          <div className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* 레이더 차트 */}
              <div className="shrink-0">
                <RadarChart data={radarData} size={240} />
              </div>
              {/* 영역별 바 */}
              <div className="flex-1 w-full space-y-2.5">
                {DOMAIN_ORDER.map((domain) => {
                  const score = domainScores[domain];
                  if (!score) return null;
                  return (
                    <DomainScoreBar
                      key={domain}
                      domain={domain}
                      accuracy={score.accuracy}
                      correct={score.correct}
                      total={score.total}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === 섹션 2: 난이도별 분석 === */}
      {difficultyStats.length > 0 && (
        <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
          <div className="px-4 border-b border-slate-100">
            <SectionHeader section="difficulty" icon={BarChart3} title="난이도별 분석" />
          </div>
          {expanded.difficulty && (
            <div className="p-4">
              <DifficultyBreakdown stats={difficultyStats} />
            </div>
          )}
        </div>
      )}

      {/* === 섹션 3: 단원별 마스터리 === */}
      {chapterStats.length > 0 && (
        <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
          <div className="px-4 border-b border-slate-100">
            <SectionHeader
              section="chapter"
              icon={BookOpen}
              title="단원별 성취도"
              badge={`${chapterStats.filter((c) => c.accuracy >= 80).length}/${chapterStats.length} 마스터`}
            />
          </div>
          {expanded.chapter && (
            <div className="p-4">
              <ChapterMasteryGrid chapters={chapterStats} />
            </div>
          )}
        </div>
      )}

      {/* === 섹션 4: 계통도 선수학습 분석 (차별화 핵심) === */}
      {prereqWeaknesses && prereqWeaknesses.length > 0 && (
        <div className="bg-white rounded-sm border border-violet-200 overflow-hidden">
          <div className="px-4 border-b border-violet-100">
            <SectionHeader section="prerequisite" icon={GitBranch} title="계통도 분석" badge="MathLab 독점" />
          </div>
          {expanded.prerequisite && (
            <div className="p-4">
              <p className="text-xs text-slate-500 mb-3">
                틀린 문제와 연결된 선수학습 개념을 분석했습니다. 아래 개념을 먼저 복습하면 성적 향상에 도움이 됩니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {prereqWeaknesses.map((pw) => (
                  <div
                    key={pw.conceptCode}
                    className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-sm border border-violet-100"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-violet-700">{pw.conceptTitle}</p>
                      {pw.relatedChapter && (
                        <p className="text-[10px] text-violet-400">{pw.relatedChapter}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === 섹션 5: 문항별 결과 === */}
      {hasDetail && (
        <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
          <div className="px-4 border-b border-slate-100">
            <SectionHeader
              section="questions"
              icon={ListChecks}
              title="문항별 결과"
              badge={`${answers.filter((a) => a.isCorrect).length}/${answers.length}`}
            />
          </div>
          {expanded.questions && (
            <div className="p-4">
              <QuestionResultTable answers={answers} questions={questions} />
            </div>
          )}
        </div>
      )}

      {/* === 섹션 6: 강점/취약 (폴백, 상세 데이터 없을 때) === */}
      {!hasDetail && (weakAreas.length > 0 || (strongAreas && strongAreas.length > 0)) && (
        <div className="bg-white rounded-sm border border-slate-200 p-4 space-y-4">
          {weakAreas.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5 mb-2">
                <Target className="w-3.5 h-3.5 text-orange-500" />
                취약 단원
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {weakAreas.map((area) => (
                  <span
                    key={area.chapter}
                    className="text-[11px] px-2 py-1 bg-red-50 text-red-700 rounded-sm font-medium border border-red-100"
                  >
                    {area.chapter} ({area.accuracy}%)
                  </span>
                ))}
              </div>
            </div>
          )}
          {strongAreas && strongAreas.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5 mb-2">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                우수 단원
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {strongAreas.map((area) => (
                  <span
                    key={area.chapter}
                    className="text-[11px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded-sm font-medium border border-emerald-100"
                  >
                    {area.chapter} ({area.accuracy}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
