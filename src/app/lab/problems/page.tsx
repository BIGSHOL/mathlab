// 🚧 Lab — 문제 품질 검수 브라우저 (읽기 전용, 내부 도구)
//   LabProblem을 개념별로 묶어 본문·보기·정답·해설을 KaTeX로 렌더한다.
//   추가 전용(additive) · Lab 네임스페이스 · 게이트는 layout(assertLabAccess)에서 처리.
//   공유 MathRenderer는 읽기 전용 재사용(CLAUDE.md 하드경계 허용).
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { MathRenderer } from '@/components/math/MathRenderer';

export const dynamic = 'force-dynamic'; // 항상 최신 DB

type Filter = 'real' | 'synthetic' | 'all';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: '객관식',
  SHORT_ANSWER: '단답형',
  DESCRIPTIVE: '서술형',
};

function diffStyle(d: number) {
  if (d <= 1) return 'border-emerald-200 text-emerald-700 bg-emerald-50';
  if (d === 2) return 'border-lime-200 text-lime-700 bg-lime-50';
  if (d === 3) return 'border-amber-200 text-amber-700 bg-amber-50';
  if (d === 4) return 'border-orange-200 text-orange-700 bg-orange-50';
  return 'border-rose-200 text-rose-700 bg-rose-50';
}

function answerText(type: string, answer: unknown): string {
  if (!answer || typeof answer !== 'object') return '';
  const a = answer as Record<string, unknown>;
  if (type === 'MULTIPLE_CHOICE') {
    const c = a.choice;
    return typeof c === 'number' ? `${CIRCLED[c - 1] ?? c}번` : '';
  }
  if (type === 'DESCRIPTIVE') return typeof a.rubric === 'string' ? a.rubric : '';
  return typeof a.value === 'string' ? a.value : '';
}

export default async function LabProblemsBrowser({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter: Filter = sp.filter === 'synthetic' ? 'synthetic' : sp.filter === 'all' ? 'all' : 'real';

  const [problems, realCount, totalCount] = await Promise.all([
    prisma.labProblem.findMany({
      // 'real'은 lab-cur만, 그 외는 lab-* 전부(모든 개념이 lab- 접두) 가져와 후처리로 분리
      where: filter === 'real' ? { conceptId: { startsWith: 'lab-cur' } } : { conceptId: { startsWith: 'lab-c' } },
      include: { concept: true },
      orderBy: [{ conceptId: 'asc' }, { difficulty: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.labProblem.count({ where: { conceptId: { startsWith: 'lab-cur' } } }),
    prisma.labProblem.count(),
  ]);

  // synthetic 필터는 lab-cur 제외한 lab-* (Prisma where로 NOT startsWith가 까다로워 후처리)
  const filtered = filter === 'synthetic' ? problems.filter((p) => !p.conceptId.startsWith('lab-cur')) : problems;

  // 개념별 그룹 (이미 conceptId asc 정렬 → monthIdx/sessionIdx 순서 보정)
  const byConcept = new Map<string, typeof filtered>();
  for (const p of filtered) {
    const arr = byConcept.get(p.conceptId) ?? [];
    arr.push(p);
    byConcept.set(p.conceptId, arr);
  }
  const groups = [...byConcept.entries()].sort(([, a], [, b]) => {
    const ca = a[0].concept;
    const cb = b[0].concept;
    return ca.monthIdx - cb.monthIdx || ca.sessionIdx - cb.sessionIdx;
  });

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'real', label: '실교재', count: realCount },
    { key: 'synthetic', label: '합성', count: totalCount - realCount },
    { key: 'all', label: '전체', count: totalCount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/lab" className="text-sm text-slate-500 hover:text-slate-800">
          ← 코크핏
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">문제 품질 검수</h1>
        <span className="text-xs text-slate-400">{filtered.length}문항 · {groups.length}개 개념</span>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/lab/problems?filter=${t.key}`}
            className={`text-sm px-3 py-1.5 rounded-sm border ${
              filter === t.key
                ? 'border-blue-300 text-blue-700 bg-blue-50 font-medium'
                : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
            }`}
          >
            {t.label} <span className="text-xs text-slate-400">{t.count}</span>
          </Link>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-sm border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">문제가 없습니다.</p>
      ) : (
        groups.map(([conceptId, list]) => {
          const c = list[0].concept;
          return (
            <section key={conceptId} className="space-y-3">
              <div className="sticky top-[57px] z-[5] flex items-baseline gap-2 bg-slate-50/95 backdrop-blur py-2 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">{c.name}</h2>
                <span className="text-xs text-slate-400">
                  {c.domain ?? '기타'} · {list.length}문항
                </span>
                <span className="ml-auto text-[10px] font-mono text-slate-300">{conceptId}</span>
              </div>

              <div className="space-y-3">
                {list.map((p, i) => {
                  const choices = Array.isArray(p.choices) ? (p.choices as string[]) : null;
                  const correctChoice =
                    p.type === 'MULTIPLE_CHOICE' && p.answer && typeof p.answer === 'object'
                      ? (p.answer as { choice?: number }).choice
                      : undefined;
                  return (
                    <div key={p.id} className="rounded-sm border border-slate-200 bg-white p-4 space-y-3">
                      {/* 메타 */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-mono text-slate-400">#{i + 1}</span>
                        <span className={`font-medium px-2 py-0.5 rounded-sm border ${diffStyle(p.difficulty)}`}>
                          Lv {p.difficulty}
                        </span>
                        <span className="font-medium px-2 py-0.5 rounded-sm border border-slate-200 text-slate-600 bg-slate-50">
                          {TYPE_LABEL[p.type] ?? p.type}
                        </span>
                        {p.source && (
                          <span className="ml-auto text-slate-400 truncate max-w-[50%]" title={p.source}>
                            {p.source}
                          </span>
                        )}
                      </div>

                      {/* 본문 */}
                      <div className="text-[15px] text-slate-900">
                        <MathRenderer content={p.body ?? '(본문 없음)'} />
                      </div>

                      {/* 보기 */}
                      {choices && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {choices.map((ch, ci) => {
                            const isCorrect = correctChoice === ci + 1;
                            return (
                              <div
                                key={ci}
                                className={`flex items-start gap-1.5 px-3 py-2 rounded-sm border text-sm ${
                                  isCorrect
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-200 bg-slate-50'
                                }`}
                              >
                                <span className={isCorrect ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                                  {CIRCLED[ci] ?? ci + 1}
                                </span>
                                <div className="flex-1">
                                  <MathRenderer content={ch} inline />
                                </div>
                                {isCorrect && <span className="text-[10px] text-emerald-600 font-medium">정답</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 정답 */}
                      <div className="flex flex-wrap items-start gap-2 text-sm border-t border-slate-100 pt-3">
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-2 py-0.5 shrink-0">
                          {p.type === 'DESCRIPTIVE' ? '채점기준' : '정답'}
                        </span>
                        <div className="flex-1 text-slate-700">
                          <MathRenderer content={answerText(p.type, p.answer) || '(없음)'} inline />
                        </div>
                      </div>

                      {/* 해설 */}
                      {p.explanation && (
                        <div className="flex flex-wrap items-start gap-2 text-sm">
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-sm px-2 py-0.5 shrink-0">
                            해설
                          </span>
                          <div className="flex-1 text-slate-600">
                            <MathRenderer content={p.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
