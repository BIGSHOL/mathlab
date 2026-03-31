'use client';

import { useState, useMemo } from 'react';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { TopicSummary, ChapterGroup, SectionId, WrongAnswerSummary, ErrorTypeSummary } from './study-strategy/types';
import { DIFFICULTY_WEIGHT } from './study-strategy/constants';

// 섹션 컴포넌트
import { TopicAnalysisSection } from './study-strategy/TopicAnalysisSection';
import { LearningStrategiesSection } from './study-strategy/LearningStrategiesSection';
import { EssayPreparationSection } from './study-strategy/EssayPreparationSection';
import { TimeAllocationSection } from './study-strategy/TimeAllocationSection';
import { CommonMistakesSection } from './study-strategy/CommonMistakesSection';
import { KillerPatternsSection } from './study-strategy/KillerPatternsSection';
import { LevelStrategiesSection } from './study-strategy/LevelStrategiesSection';
import { TimelineSection } from './study-strategy/TimelineSection';
import { PersonalizedStrategySection } from './study-strategy/PersonalizedStrategySection';
import { GradeConnectionsSection } from './study-strategy/GradeConnectionsSection';

interface StudyStrategyTabProps {
  questions: AnalyzedQuestion[];
  grade?: string;
}

const ALL_SECTIONS: SectionId[] = [
  'personalized', 'topicAnalysis', 'learningStrategies', 'essay',
  'timeAllocation', 'mistakes', 'connections', 'killer', 'levelStrategies', 'timeline',
];

export function StudyStrategyTab({ questions }: StudyStrategyTabProps) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(ALL_SECTIONS));

  const toggleSection = (id: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedSections.size === 0) setExpandedSections(new Set(ALL_SECTIONS));
    else setExpandedSections(new Set());
  };

  // ── 토픽 분석 데이터 ──
  const { topicSummaries, chapterGroups, totalPoints, essayQuestions, is4Level } = useMemo(() => {
    const topicMap = new Map<string, TopicSummary>();
    const totalPts = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const is4L = questions.some(q => ['concept', 'pattern', 'reasoning', 'creative', '1', '2', '3', '4', '5'].includes(q.difficulty));

    questions.forEach(q => {
      const rawTopic = q.topic || '기타';
      const parts = rawTopic.split(' > ');
      const shortTopic = parts[parts.length - 1] || rawTopic;

      if (!topicMap.has(rawTopic)) {
        topicMap.set(rawTopic, {
          topic: rawTopic, shortTopic,
          questionCount: 0, totalPoints: 0, percentage: 0,
          difficulties: [], types: [],
          essayCount: 0, essayNumbers: [],
          avgDifficulty: 0, features: [], questionNumbers: [],
        });
      }

      const s = topicMap.get(rawTopic)!;
      s.questionCount++;
      s.totalPoints += q.points || 0;
      if (q.difficulty) s.difficulties.push(q.difficulty);
      if (q.question_type) s.types.push(q.question_type);

      const isEssay = q.question_format === 'essay' || q.question_format === 'short_answer';
      const qNum = typeof q.question_number === 'number' ? q.question_number
        : parseInt(String(q.question_number).replace(/\D/g, '')) || 0;

      if (isEssay) { s.essayCount++; if (qNum) s.essayNumbers.push(qNum); }
      else { if (qNum) s.questionNumbers.push(qNum); }
    });

    topicMap.forEach(s => {
      s.percentage = totalPts > 0 ? (s.totalPoints / totalPts) * 100 : 0;
      if (s.difficulties.length > 0) {
        s.avgDifficulty = s.difficulties.reduce((a, d) => a + (DIFFICULTY_WEIGHT[d] || 2), 0) / s.difficulties.length;
      }
      if (s.essayCount > 0) s.features.push(`서술형 ${s.essayCount}번`);
      if (s.avgDifficulty >= 3) s.features.push('고난도 집중');
      if (s.percentage >= 20) s.features.push('핵심 단원');
    });

    const sorted = Array.from(topicMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);

    // 대단원 그룹핑
    const chapterMap = new Map<string, ChapterGroup>();
    sorted.forEach(s => {
      const parts = s.topic.split(' > ');
      const chName = parts.length >= 2 ? parts[1] : parts[0];
      if (!chapterMap.has(chName)) {
        chapterMap.set(chName, {
          chapterName: chName, topics: [], questionCount: 0, totalPoints: 0,
          percentage: 0, essayCount: 0, essayNumbers: [], avgDifficulty: 0, features: [],
        });
      }
      const ch = chapterMap.get(chName)!;
      ch.topics.push(s);
      ch.questionCount += s.questionCount;
      ch.totalPoints += s.totalPoints;
      ch.essayCount += s.essayCount;
      ch.essayNumbers.push(...s.essayNumbers);
    });

    chapterMap.forEach(ch => {
      ch.percentage = totalPts > 0 ? (ch.totalPoints / totalPts) * 100 : 0;
      const allDiffs = ch.topics.flatMap(t => t.difficulties);
      if (allDiffs.length > 0) {
        ch.avgDifficulty = allDiffs.reduce((a, d) => a + (DIFFICULTY_WEIGHT[d] || 2), 0) / allDiffs.length;
      }
      if (ch.essayCount > 0) ch.features.push(`서술형 ${ch.essayCount}문항`);
      if (ch.avgDifficulty >= 3) ch.features.push('고난도 집중');
      if (chapterMap.size >= 2 && ch.percentage >= 15) ch.features.push('핵심 대단원');
      ch.topics.sort((a, b) => b.totalPoints - a.totalPoints);
    });

    return {
      topicSummaries: sorted,
      chapterGroups: Array.from(chapterMap.values()).sort((a, b) => b.totalPoints - a.totalPoints),
      totalPoints: totalPts,
      essayQuestions: questions.filter(q => q.question_format === 'essay' || q.question_format === 'short_answer'),
      is4Level: is4L,
    };
  }, [questions]);

  // ── 정오답 분석 ──
  const gradingAnalysis = useMemo(() => {
    const graded = questions.filter(q => q.is_correct === true || q.is_correct === false);
    if (!graded.length) return { hasData: false, wrong: [] as WrongAnswerSummary[], errors: [] as ErrorTypeSummary[], lostPts: 0, total: 0, correct: 0, wrongCount: 0 };

    const correct = graded.filter(q => q.is_correct);
    const wrong = graded.filter(q => !q.is_correct);

    const byTopic = new Map<string, WrongAnswerSummary>();
    wrong.forEach(q => {
      const t = q.topic || '기타';
      const short = t.split(' > ').pop() || t;
      if (!byTopic.has(t)) byTopic.set(t, { topic: t, shortTopic: short, questionNumbers: [], totalPoints: 0, lostPoints: 0, errorTypes: [], difficulty: [] });
      const s = byTopic.get(t)!;
      const n = typeof q.question_number === 'number' ? q.question_number : parseInt(String(q.question_number)) || 0;
      if (n) s.questionNumbers.push(n);
      s.totalPoints += q.points || 0;
      s.lostPoints += (q.points || 0) - (q.earned_points ?? 0);
      if (q.error_type) s.errorTypes.push(q.error_type);
      if (q.difficulty) s.difficulty.push(q.difficulty);
    });

    const byError = new Map<string, ErrorTypeSummary>();
    wrong.forEach(q => {
      const e = q.error_type || 'unknown';
      if (!byError.has(e)) byError.set(e, { errorType: e, count: 0, questionNumbers: [], totalLostPoints: 0 });
      const s = byError.get(e)!;
      s.count++;
      const n = typeof q.question_number === 'number' ? q.question_number : parseInt(String(q.question_number)) || 0;
      if (n) s.questionNumbers.push(n);
      s.totalLostPoints += (q.points || 0) - (q.earned_points ?? 0);
    });

    return {
      hasData: true,
      wrong: Array.from(byTopic.values()).sort((a, b) => b.lostPoints - a.lostPoints),
      errors: Array.from(byError.values()).filter(e => e.errorType !== 'unknown').sort((a, b) => b.count - a.count),
      lostPts: wrong.reduce((s, q) => s + (q.points || 0) - (q.earned_points ?? 0), 0),
      total: graded.length,
      correct: correct.length,
      wrongCount: wrong.length,
    };
  }, [questions]);

  if (!questions.length) {
    return <div className="bg-white border rounded-sm p-8 text-center text-slate-400 text-sm">분석할 문항이 없습니다.</div>;
  }

  return (
    <div className="space-y-4">
      {/* 모든 섹션 접기/펼치기 */}
      <div className="flex justify-end">
        <button onClick={toggleAll} className="text-xs text-primary hover:underline font-medium px-3 py-1.5">
          {expandedSections.size === 0 ? '모든 섹션 펼치기' : '모든 섹션 접기'}
        </button>
      </div>

      {/* 1. 맞춤형 학습 대책 */}
      {gradingAnalysis.hasData && (
        <PersonalizedStrategySection
          wrongAnswerSummaries={gradingAnalysis.wrong}
          errorTypeSummaries={gradingAnalysis.errors}
          totalLostPoints={gradingAnalysis.lostPts}
          totalGradedQuestions={gradingAnalysis.total}
          correctCount={gradingAnalysis.correct}
          wrongCount={gradingAnalysis.wrongCount}
          isSectionExpanded={expandedSections.has('personalized')}
          onToggleSection={() => toggleSection('personalized')}
        />
      )}

      {/* 2. 출제 영역별 상세 분석 */}
      <TopicAnalysisSection
        chapterGroups={chapterGroups}
        totalPoints={totalPoints}
        is4Level={is4Level}
        isSectionExpanded={expandedSections.has('topicAnalysis')}
        onToggleSection={() => toggleSection('topicAnalysis')}
      />

      {/* 3. 영역별 학습 전략 */}
      <LearningStrategiesSection
        topicSummaries={topicSummaries}
        is4Level={is4Level}
        isSectionExpanded={expandedSections.has('learningStrategies')}
        onToggleSection={() => toggleSection('learningStrategies')}
      />

      {/* 4. 서술형 대비 전략 */}
      <EssayPreparationSection
        essayQuestions={essayQuestions}
        isSectionExpanded={expandedSections.has('essay')}
        onToggleSection={() => toggleSection('essay')}
      />

      {/* 5. 시험 시간 배분 전략 */}
      <TimeAllocationSection
        topicSummaries={topicSummaries}
        isSectionExpanded={expandedSections.has('timeAllocation')}
        onToggleSection={() => toggleSection('timeAllocation')}
      />

      {/* 6. 자주 하는 실수 유형 */}
      <CommonMistakesSection
        topicSummaries={topicSummaries}
        isSectionExpanded={expandedSections.has('mistakes')}
        onToggleSection={() => toggleSection('mistakes')}
      />

      {/* 7. 학년별 연계 경고 */}
      <GradeConnectionsSection
        questions={questions}
        isSectionExpanded={expandedSections.has('connections')}
        onToggleSection={() => toggleSection('connections')}
      />

      {/* 8. 킬러 문항 유형 경고 */}
      <KillerPatternsSection
        questions={questions}
        isSectionExpanded={expandedSections.has('killer')}
        onToggleSection={() => toggleSection('killer')}
      />

      {/* 9. 수준별 학습 전략 */}
      <LevelStrategiesSection
        topicSummaries={topicSummaries}
        questions={questions}
        isSectionExpanded={expandedSections.has('levelStrategies')}
        onToggleSection={() => toggleSection('levelStrategies')}
      />

      {/* 10. 4주 전 학습 타임라인 */}
      <TimelineSection
        isSectionExpanded={expandedSections.has('timeline')}
        onToggleSection={() => toggleSection('timeline')}
      />
    </div>
  );
}
