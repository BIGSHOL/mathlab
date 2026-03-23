'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { A4Page, A4PrintPage } from '@/components/print-preview/A4Page';
import { ZoomToolbar } from '@/components/print-preview/ZoomToolbar';
import { usePreviewScale } from '@/hooks/usePreviewScale';
import {
  ReportPageWrapper,
  ReportCover,
  ReportSummary,
  ReportDifficultyChapter,
  ReportWeakAreas,
  ReportQuestionDetail,
  ReportTeacherComment,
} from '@/components/report';
import type { LevelTestReportData } from '@/types/report';
import type { LevelTestDomain } from '@/types';
import { classifyAnswer } from '@/lib/utils/answer-status';

const QUESTIONS_PER_DETAIL_PAGE = 18;

export default function LevelTestReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const attemptId = searchParams.get('attemptId');

  const [data, setData] = useState<LevelTestReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { scale, setScale, scalePercent, galleryRef, fitToContainer, setScaleFromSlider } = usePreviewScale();

  // 데이터 로드
  useEffect(() => {
    if (!attemptId) {
      setError('attemptId가 필요합니다');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/level-tests/${id}/report?attemptId=${attemptId}`);
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setError(json?.error?.message ?? '보고서 데이터를 불러올 수 없습니다');
          return;
        }
        const json = await res.json();
        setData(json.data);
      } catch {
        setError('네트워크 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, attemptId]);

  // 파생 데이터 계산
  const derived = useMemo(() => {
    if (!data) return null;

    const answerMap = new Map(data.answers.map((a) => [a.questionId, a]));

    // 난이도별 통계
    const diffMap = new Map<string, { total: number; correct: number }>();
    for (const q of data.questions) {
      const a = answerMap.get(q.id);
      const entry = diffMap.get(q.difficulty) ?? { total: 0, correct: 0 };
      entry.total++;
      if (a?.isCorrect) entry.correct++;
      diffMap.set(q.difficulty, entry);
    }
    const difficultyStats = [...diffMap.entries()].map(([difficulty, s]) => ({
      difficulty,
      total: s.total,
      correct: s.correct,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));

    // 단원별 통계
    const chMap = new Map<string, { total: number; correct: number }>();
    for (const q of data.questions) {
      const a = answerMap.get(q.id);
      const entry = chMap.get(q.chapter) ?? { total: 0, correct: 0 };
      entry.total++;
      if (a?.isCorrect) entry.correct++;
      chMap.set(q.chapter, entry);
    }
    const chapterStats = [...chMap.entries()].map(([name, s]) => ({
      name,
      total: s.total,
      correct: s.correct,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));

    // 전체 풀이시간
    const totalTimeSeconds = Math.round(data.answers.reduce((s, a) => s + a.timeSpentSeconds, 0));

    // 상태 분류 보정 (null인 경우 계산)
    const enrichedAnswers = data.answers.map((a) => {
      if (a.statusClassification) return a;
      const q = data.questions.find((q) => q.id === a.questionId);
      const status = classifyAnswer({
        isCorrect: a.isCorrect,
        timeSpentSeconds: a.timeSpentSeconds,
        difficulty: q?.difficulty ?? 'MEDIUM',
      });
      return { ...a, statusClassification: status.status };
    });

    // 문제별 상세 페이지 분할
    const detailPageCount = Math.max(1, Math.ceil(data.questions.length / QUESTIONS_PER_DETAIL_PAGE));

    return { difficultyStats, chapterStats, totalTimeSeconds, enrichedAnswers, detailPageCount };
  }, [data]);

  // 총 페이지 수 (cover + summary + diffchapter + weak + detail(N) + teacher)
  const totalPages = derived ? 4 + derived.detailPageCount + 1 : 6;

  const testDate = data?.attempt.completedAt
    ? new Date(data.attempt.completedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '';

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-white">
        {/* ZoomToolbar 스켈레톤 */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <div className="w-px h-4 bg-slate-200" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        </div>
        {/* A4 갤러리 스켈레톤 */}
        <div className="flex-1 overflow-auto bg-slate-100">
          <div className="flex gap-4 p-4 items-start min-w-max">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="w-[595px] h-[842px] bg-white rounded shadow-md p-8 space-y-4 shrink-0">
                {i === 0 ? (
                  /* 표지 */
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  /* 본문 페이지 */
                  <>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-6 w-40" />
                    <div className="space-y-3 mt-4">
                      {Array.from({ length: 6 }, (_, j) => (
                        <Skeleton key={j} className="h-4 w-full" />
                      ))}
                    </div>
                    <Skeleton className="h-32 w-full rounded mt-4" />
                    <div className="space-y-2 mt-4">
                      {Array.from({ length: 4 }, (_, j) => (
                        <Skeleton key={j} className="h-3 w-full" />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !derived) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-500">{error ?? '데이터를 불러올 수 없습니다'}</p>
          <Link href={`/level-test/${id}/results`} className="text-xs text-primary hover:underline">
            결과 페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 각 페이지의 내용을 정의
  const pages: React.ReactNode[] = [];

  // Page 1: 표지
  pages.push(
    <ReportPageWrapper key="cover" pageNumber={1} totalPages={totalPages} showHeader={false}>
      <ReportCover
        testTitle={data.test.title}
        studentName={data.student.name}
        studentGrade={data.student.grade}
        testDate={testDate}
        questionCount={data.test.questionCount}
        academyName={data.academy.name}
      />
    </ReportPageWrapper>
  );

  // Page 2: 종합 분석 + 영역별 분석 (통합)
  pages.push(
    <ReportPageWrapper key="summary" pageNumber={2} totalPages={totalPages} studentName={data.student.name} testTitle={data.test.title} testDate={testDate}>
      <ReportSummary
        recommendLevel={data.diagnostic.recommendLevel}
        overallAccuracy={data.diagnostic.overallAccuracy}
        correctCount={data.attempt.correctCount}
        totalCount={data.attempt.totalCount}
        totalTimeSeconds={derived.totalTimeSeconds}
        domainScores={data.diagnostic.domainScores as Record<LevelTestDomain, { total: number; correct: number; accuracy: number }>}
        studentName={data.student.name}
        aiOverallFeedback={data.aiContent?.overallFeedback}
        aiDomainFeedbacks={data.aiContent?.domainFeedbacks}
      />
    </ReportPageWrapper>
  );

  // Page 3: 난이도 + 단원
  pages.push(
    <ReportPageWrapper key="diffchapter" pageNumber={3} totalPages={totalPages} studentName={data.student.name} testTitle={data.test.title} testDate={testDate}>
      <ReportDifficultyChapter
        difficultyStats={derived.difficultyStats}
        chapterStats={derived.chapterStats}
        difficultyComment={data.comments?.difficultyComment}
        chapterComment={data.comments?.chapterComment}
      />
    </ReportPageWrapper>
  );

  // Page 4: 취약 영역 + 선수학습
  pages.push(
    <ReportPageWrapper key="weak" pageNumber={4} totalPages={totalPages} studentName={data.student.name} testTitle={data.test.title} testDate={testDate}>
      <ReportWeakAreas
        weakAreas={data.diagnostic.weakAreas}
        strongAreas={data.diagnostic.strongAreas}
        prerequisiteChains={data.diagnostic.prerequisiteChains}
        prerequisiteWeaknesses={data.diagnostic.prerequisiteWeaknesses}
        aiPrerequisiteFeedback={data.aiContent?.prerequisiteFeedback}
      />
    </ReportPageWrapper>
  );

  // Page 5+: 문제별 상세 (페이지 분할)
  for (let i = 0; i < derived.detailPageCount; i++) {
    const startIdx = i * QUESTIONS_PER_DETAIL_PAGE;
    const endIdx = Math.min(startIdx + QUESTIONS_PER_DETAIL_PAGE, data.questions.length);
    pages.push(
      <ReportPageWrapper
        key={`detail-${i}`}
        pageNumber={5 + i}
        totalPages={totalPages}
        studentName={data.student.name}
        testTitle={data.test.title}
        testDate={testDate}
      >
        <ReportQuestionDetail
          questions={data.questions}
          answers={derived.enrichedAnswers}
          startIdx={startIdx}
          endIdx={endIdx}
          showSummary={i === 0}
        />
      </ReportPageWrapper>
    );
  }

  // 마지막 페이지: 학습 방향
  pages.push(
    <ReportPageWrapper
      key="teacher"
      pageNumber={totalPages}
      totalPages={totalPages}
      studentName={data.student.name}
      testTitle={data.test.title}
      testDate={testDate}
    >
      <ReportTeacherComment
        recommendLevel={data.diagnostic.recommendLevel}
        overallAccuracy={data.diagnostic.overallAccuracy}
        weakAreas={data.diagnostic.weakAreas}
        strongAreas={data.diagnostic.strongAreas}
        prerequisiteCount={data.diagnostic.prerequisiteChains.length}
        academyName={data.academy.name}
        studentName={data.student.name}
        totalReview={data.aiContent?.totalReview}
        analysisGuide={data.aiContent?.analysisGuide}
      />
    </ReportPageWrapper>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-white">
      {/* 툴바 */}
      <ZoomToolbar
        scale={scale}
        scalePercent={scalePercent}
        onScaleFromSlider={setScaleFromSlider}
        onSetScale={setScale}
        onFitToContainer={fitToContainer}
        onPrint={() => window.print()}
        leftContent={
          <div className="flex items-center gap-2">
            <Link
              href={`/level-test/${id}/results`}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              결과 목록
            </Link>
            <div className="w-px h-4 bg-slate-200" />
            <span className="text-xs font-bold text-text-primary">{data.student.name}</span>
            <span className="text-xs text-slate-400">진단 보고서 · {totalPages}페이지</span>
          </div>
        }
      />

      {/* 미리보기 갤러리 (화면) */}
      <div ref={galleryRef} className="flex-1 overflow-auto bg-slate-100 print:hidden">
        <div className="flex gap-4 p-4 items-start min-w-max">
          {pages.map((page, i) => (
            <A4Page key={i} scale={scale} paddingClass="">
              {page}
            </A4Page>
          ))}
        </div>
      </div>

      {/* 인쇄 전용 */}
      <div className="hidden print:block">
        {pages.map((page, i) => (
          <A4PrintPage key={i} pageBreak={i < pages.length - 1} paddingClass="">
            {page}
          </A4PrintPage>
        ))}
      </div>
    </div>
  );
}
