// 🚧 수학 랩실(Lab) — 코크핏 (실DB 연동, MathLab 라이트 디자인)
//   데모 학생의 척추 상태(mastery/워크시트/리포트)를 실DB에서 읽어 보여주고, 루프를 구동한다.
//   ⚠️ 게이트는 layout(assertLabAccess)에서 처리 — SUPER_ADMIN + LAB_ENABLED 전제.
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { masteryLabel } from '@/lib/lab/report-policy';
import { LabCockpitActions } from './LabCockpitActions';

const SID = 'lab-student-demo';
export const dynamic = 'force-dynamic'; // 항상 최신 DB(캐시 금지)

const STAGES = [
  { key: '진단', impl: 'autoDiagnoser · BKT p(mastered)', mode: 'AUTO' },
  { key: '처방', impl: 'smartPrescriber · 약점·선수개념 적응', mode: 'AUTO' },
  { key: '공급', impl: 'manualSupplier · 문제은행→시험지', mode: 'MANUAL' },
  { key: '채점', impl: 'autoGrader · 객관식·단답 + 서술형 AI', mode: 'AUTO' },
  { key: '보고', impl: 'autoReporter · 학부모/원장', mode: 'AUTO' },
];

function bucket(score: number) {
  if (score >= 0.8) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
  if (score >= 0.6) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-rose-500', text: 'text-rose-600' };
}

function jval(summary: unknown, path: string[]): unknown {
  let cur: unknown = summary;
  for (const k of path) {
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) cur = (cur as Record<string, unknown>)[k];
    else return undefined;
  }
  return cur;
}

export default async function LabHome() {
  const student = await prisma.labStudent.findUnique({ where: { id: SID } });

  if (!student) {
    return (
      <div className="rounded-sm border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">데모 학생이 없습니다</h1>
        <p className="mt-2 text-sm text-slate-500">
          시드가 필요합니다:{' '}
          <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm text-xs">
            node --env-file=.env.local --import tsx scripts/lab/seed-synthetic.ts
          </code>
        </p>
      </div>
    );
  }

  const [mastery, worksheets, reports, conceptCount] = await Promise.all([
    prisma.labMasteryRecord.findMany({ where: { studentId: SID }, include: { concept: true } }),
    prisma.labWorksheet.findMany({
      where: { studentId: SID },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        _count: { select: { problems: true } },
        submission: { include: { _count: { select: { items: true } } } },
      },
    }),
    prisma.labReport.findMany({ where: { studentId: SID }, orderBy: { createdAt: 'desc' }, take: 4 }),
    prisma.labConcept.count(),
  ]);
  mastery.sort((a, b) => a.concept.monthIdx - b.concept.monthIdx || a.concept.sessionIdx - b.concept.sessionIdx);
  const avg = mastery.length ? mastery.reduce((s, m) => s + m.score, 0) / mastery.length : 0;

  const kpis = [
    { label: '평가 개념', val: `${mastery.length} / ${conceptCount}` },
    { label: '평균 숙련도', val: `${Math.round(avg * 100)}%` },
    { label: '워크시트', val: worksheets.length },
    { label: '리포트', val: reports.length },
  ];

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {student.name} <span className="text-sm font-normal text-slate-400">· {student.grade ?? '학년 미정'}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            학습 척추 — 진단·처방·공급·채점·보고가 자동으로 돈다. 버튼으로 한 바퀴씩 구동.
          </p>
        </div>
        <LabCockpitActions studentId={SID} />
      </section>

      {/* KPI */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-sm border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{k.val}</div>
          </div>
        ))}
      </section>

      {/* 숙련도 */}
      <section>
        <h2 className="text-xs font-medium tracking-wide text-slate-400 mb-3">숙련도 — p(mastered), BKT 추정</h2>
        {mastery.length === 0 ? (
          <p className="rounded-sm border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            아직 학습 기록이 없습니다. <span className="text-blue-600 font-medium">▶ 데모 사이클 한 바퀴</span>를 눌러 채점→진단을 돌려보세요.
          </p>
        ) : (
          <div className="space-y-2">
            {mastery.map((m) => {
              const c = bucket(m.score);
              return (
                <div key={m.conceptId} className="flex items-center gap-3 rounded-sm border border-slate-200 bg-white px-4 py-2.5">
                  <div className="w-40 shrink-0">
                    <div className="text-sm text-slate-900 truncate">{m.concept.name}</div>
                    <div className="text-[11px] text-slate-400">{m.concept.domain ?? '기타'} · 관측 {m.observationCount}</div>
                  </div>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${c.bar}`} style={{ width: `${Math.round(m.score * 100)}%` }} />
                  </div>
                  <div className={`w-28 text-right text-sm font-medium ${c.text}`}>
                    {Math.round(m.score * 100)}% <span className="text-[11px] text-slate-400">{masteryLabel(m.score)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 워크시트 */}
        <section>
          <h2 className="text-xs font-medium tracking-wide text-slate-400 mb-3">최근 워크시트 (공급→채점)</h2>
          <div className="space-y-2">
            {worksheets.length === 0 ? (
              <p className="text-sm text-slate-400">없음</p>
            ) : (
              worksheets.map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-sm border ${
                    w.status === 'GRADED' ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : w.status === 'SUBMITTED' ? 'border-blue-200 text-blue-700 bg-blue-50'
                    : 'border-slate-200 text-slate-500 bg-slate-50'
                  }`}>{w.status}</span>
                  <span className="text-slate-700">{w._count.problems}문항</span>
                  {w.submission && <span className="text-slate-400">· 채점 {w.submission._count.items}</span>}
                  {w.status === 'PRESCRIBED' && !w.submission ? (
                    <Link href={`/lab/worksheet/${w.id}`} className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-700">
                      풀기 →
                    </Link>
                  ) : w.status === 'SUBMITTED' ? (
                    <span className="ml-auto text-[11px] text-blue-600">채점 대기</span>
                  ) : (
                    <span className="ml-auto text-[11px] text-slate-300 font-mono">{w.id.slice(-6)}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* 리포트 */}
        <section>
          <h2 className="text-xs font-medium tracking-wide text-slate-400 mb-3">최근 리포트 (보고)</h2>
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-400">없음 — 위 버튼으로 생성</p>
            ) : (
              reports.map((r) => {
                const isParent = r.type === 'PARENT';
                const headline = isParent
                  ? `종합 ${jval(r.summary, ['overall']) ?? '-'}`
                  : `숙련 ${jval(r.summary, ['stats', 'mastered']) ?? 0} · 약점 ${jval(r.summary, ['stats', 'weak']) ?? 0} · 평균 ${Math.round(Number(jval(r.summary, ['stats', 'avgScore']) ?? 0) * 100)}%`;
                return (
                  <div key={r.id} className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-sm border ${isParent ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-violet-200 text-violet-700 bg-violet-50'}`}>
                      {isParent ? '학부모' : '원장'}
                    </span>
                    <span className="ml-2 text-slate-700">{headline}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* 파이프라인 상태 */}
      <section className="pb-2">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 mb-3">5단계 파이프라인 (전체 자동화 완료)</h2>
        <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {STAGES.map((s) => (
                <tr key={s.key}>
                  <td className="px-4 py-2.5 font-medium text-slate-900 w-16">{s.key}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{s.impl}</td>
                  <td className="px-4 py-2.5 w-20">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-sm border ${s.mode === 'AUTO' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                      {s.mode}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
