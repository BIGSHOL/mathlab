// 🚧 Lab ⑤ — 워크시트 풀이 화면 (실DB)
//   처방→공급된 워크시트의 문항을 보여주고 학생이 답을 입력·제출한다.
//   ⚠️ 합성 시드는 문제 본문(bodyRef)이 자리표시자 → 유형별 입력만 노출(데모).
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
    // 합성 문제라 본문이 없어 정답을 알 길이 없음 → 데모 힌트로 정답값 노출(SUPER_ADMIN 내부 도구).
    const a = wp.problem.answer as { choice?: number; value?: string } | null;
    const answerHint =
      wp.problem.type === 'MULTIPLE_CHOICE'
        ? a?.choice != null ? `${a.choice}` : ''
        : a?.value != null ? `${a.value}` : '';
    return {
      problemId: wp.problemId,
      order: wp.order,
      type: wp.problem.type as 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'DESCRIPTIVE',
      difficulty: wp.problem.difficulty,
      concept: wp.problem.concept.name,
      answerHint,
    };
  });

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
        <span className="ml-auto text-xs text-slate-400">{problems.length}문항 · 합성 문제(본문 보류)</span>
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
