/**
 * 총평 템플릿 비교 미리보기 (개발/디자인 검토용).
 *
 * 실제 DB 의 분석본 하나를 골라 **테마 4종 · 프리셋 조합 · 블록별 variant** 를 한 화면에 늘어놓는다.
 * 드로어 편집기로 하나씩 바꿔 보는 것과 달리, 선택지 전체를 동시에 눈으로 비교하는 용도.
 *
 * 인증은 (teacher) 레이아웃이 이미 강제한다 (미로그인/STUDENT → /login).
 * 차트 4종은 분석 화면에서 별도 렌더되므로 여기서는 전달하지 않는다 → 차트 블록은 자동 생략된다.
 */

import { prisma } from '@/lib/db';
import { sumPoints } from '@/lib/exam-analysis/points';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { BlockMeta } from '@/lib/exam-analysis/blocks/types';
import { TemplatePreviewClient } from './TemplatePreviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function TemplatePreviewPage({ searchParams }: PageProps) {
  const { id } = await searchParams;

  // 총평(commentary)이 있는 분석본만 후보 — 없는 시험지를 고르면 볼 게 없다
  const candidates = await prisma.examAnalysis.findMany({
    where: { extensions: { some: { agentType: 'commentary' } } },
    orderBy: { createdAt: 'desc' },
    select: {
      examPaperId: true,
      examPaper: { select: { title: true, schoolName: true, grade: true } },
    },
    take: 30,
  });
  const options = candidates.map((c) => ({
    id: c.examPaperId,
    label: c.examPaper?.title || c.examPaperId,
    grade: c.examPaper?.grade || '',
  }));

  const targetId = id && options.some((o) => o.id === id) ? id : options[0]?.id;

  if (!targetId) {
    return (
      <div className="p-10 text-sm text-slate-500">
        총평이 생성된 분석본이 없습니다. 먼저 시험지를 분석하고 AI 총평을 생성하세요.
      </div>
    );
  }

  const analysis = await prisma.examAnalysis.findFirst({
    where: { examPaperId: targetId },
    orderBy: { createdAt: 'desc' },
    select: {
      questions: true,
      analyzedAt: true,
      examPaper: { select: { title: true, schoolName: true, grade: true } },
      extensions: { where: { agentType: 'commentary' }, select: { result: true } },
    },
  });

  const commentary = analysis?.extensions[0]?.result as unknown as CommentaryResult | undefined;
  if (!analysis || !commentary) {
    return <div className="p-10 text-sm text-slate-500">분석/총평 데이터를 찾을 수 없습니다.</div>;
  }

  // Json? — 배열인지 확인하고 쓴다 (CLAUDE.md Json 정규화 규칙)
  const questions: AnalyzedQuestion[] = Array.isArray(analysis.questions)
    ? (analysis.questions as unknown as AnalyzedQuestion[])
    : [];

  const meta: BlockMeta = {
    examTitle: analysis.examPaper?.title || '',
    schoolName: analysis.examPaper?.schoolName ?? null,
    grade: analysis.examPaper?.grade || '',
    analyzedAt: analysis.analyzedAt ? analysis.analyzedAt.toISOString() : null,
    totalQuestions: questions.length,
    totalPoints: sumPoints(questions.map((q) => q.points)),
    hasStudentData: questions.some((q) => q.is_correct !== null),
  };

  return (
    <TemplatePreviewClient
      commentary={commentary}
      questions={questions}
      meta={meta}
      options={options}
      currentId={targetId}
    />
  );
}
