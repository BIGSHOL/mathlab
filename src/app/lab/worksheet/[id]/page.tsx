// 🚧 Lab ⑤ — 워크시트 풀이 화면 (실DB)
//   처방→공급된 워크시트의 문항을 보여주고 학생이 답을 입력·제출한다.
//   실문제는 본문(body)+보기(choices)를 KaTeX로 렌더. 합성 시드(본문 없음)는 유형별 입력만(데모).
//   게이트는 layout(assertLabAccess)에서 처리.
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SolveForm } from './SolveForm';

export const dynamic = 'force-dynamic';

export default async function WorksheetSolve({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await prisma.labWorksheet.findUnique({
    where: { id },
    include: {
      problems: { orderBy: { order: 'asc' }, include: { problem: { include: { concept: true } } } },
      submission: { select: { id: true } },
    },
  });
  if (!ws) notFound();

  const problems = ws.problems.map((wp) => {
    const p = wp.problem;
    const a = p.answer as { choice?: number; value?: string } | null;
    // 합성 문제(본문 없음)일 때만 데모 힌트로 정답값 노출 — 실문제는 본문이 있어 힌트 불필요.
    const answerHint =
      !p.body
        ? p.type === 'MULTIPLE_CHOICE'
          ? a?.choice != null ? `${a.choice}` : ''
          : a?.value != null ? `${a.value}` : ''
        : '';
    return {
      problemId: wp.problemId,
      order: wp.order,
      type: p.type as 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'DESCRIPTIVE',
      difficulty: p.difficulty,
      concept: p.concept.name,
      body: p.body ?? null,
      choices: Array.isArray(p.choices) ? (p.choices as string[]) : null,
      diagram: p.diagram ?? null,
      answerHint,
    };
  });
  const allSynthetic = problems.every((p) => !p.body);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/lab" className="text-sm text-slate-500 hover:text-slate-800">← 코크핏</Link>
        <h1 className="text-xl font-semibold text-slate-900">시험지 풀기</h1>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-sm border ${
          ws.status === 'GRADED' ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
          : ws.status === 'SUBMITTED' ? 'border-blue-200 text-blue-700 bg-blue-50'
          : 'border-slate-200 text-slate-500 bg-slate-50'
        }`}>{ws.status}</span>
        <span className="ml-auto text-xs text-slate-400">
          {problems.length}문항{allSynthetic ? ' · 합성 문제(본문 보류)' : ''}
        </span>
      </div>

      {ws.submission ? (
        <p className="rounded-sm border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          이미 제출된 시험지입니다. <Link href="/lab" className="text-blue-600 font-medium">코크핏</Link>에서 채점하세요.
        </p>
      ) : (
        <SolveForm worksheetId={ws.id} problems={problems} />
      )}
    </div>
  );
}
