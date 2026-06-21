// 🚧 수학 랩실(Lab) — 코크핏 (실DB 연동)
//   데모 학생의 척추 상태(mastery/워크시트/리포트)를 실DB에서 읽어 보여주고, 루프를 구동한다.
//   ⚠️ 게이트는 layout(assertLabAccess)에서 처리 — 이 페이지는 SUPER_ADMIN + LAB_ENABLED 전제.
import { prisma } from '@/lib/db';
import { masteryLabel } from '@/lib/lab/report-policy';
import { LabCockpitActions } from './LabCockpitActions';

const SID = 'lab-student-demo';
export const dynamic = 'force-dynamic'; // 항상 최신 DB(캐시 금지)

const STAGES = [
  { key: '진단', io: '채점결과 → masteryMap', impl: 'autoDiagnoser (BKT)', mode: 'AUTO' },
  { key: '처방', io: 'mastery + 진도 → 처방', impl: 'smartPrescriber (약점·선수개념)', mode: 'AUTO' },
  { key: '공급', io: '처방 → 시험지', impl: 'manualSupplier (HWP 보류)', mode: 'MANUAL' },
  { key: '채점', io: '시험지 + 답안 → 정오', impl: 'autoGrader (객·단 + 서술형 AI)', mode: 'AUTO' },
  { key: '보고', io: 'mastery → 리포트', impl: 'autoReporter (학부모/원장)', mode: 'AUTO' },
];

function bucketColor(score: number) {
  if (score >= 0.8) return { bar: 'bg-emerald-500', text: 'text-emerald-300' };
  if (score >= 0.6) return { bar: 'bg-sky-500', text: 'text-sky-300' };
  return { bar: 'bg-rose-500', text: 'text-rose-300' };
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
      <div className="rounded-sm border border-slate-800 bg-slate-900/40 p-6">
        <h1 className="text-xl font-semibold text-white">데모 학생이 없습니다</h1>
        <p className="mt-2 text-sm text-slate-400">
          시드가 필요합니다:{' '}
          <code className="text-amber-300">node --env-file=.env.local --import tsx scripts/lab/seed-synthetic.ts</code>
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
  mastery.sort((a, b) => (a.concept.monthIdx - b.concept.monthIdx) || (a.concept.sessionIdx - b.concept.sessionIdx));
  const avg = mastery.length ? mastery.reduce((s, m) => s + m.score, 0) / mastery.length : 0;

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {student.name} <span className="text-sm font-normal text-slate-500">· {student.grade ?? '학년 미정'}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            데모 학생의 학습 척추 — 진단·처방·공급·채점·보고가 자동으로 돈다. 버튼으로 한 바퀴씩 구동.
          </p>
        </div>
        <LabCockpitActions studentId={SID} />
      </section>

      {/* KPI */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '평가 개념', val: `${mastery.length} / ${conceptCount}` },
          { label: '평균 숙련도', val: `${Math.round(avg * 100)}%` },
          { label: '워크시트', val: worksheets.length },
          { label: '리포트', val: reports.length },
        ].map((k) => (
          <div key={k.label} className="rounded-sm border border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">{k.label}</div>
            <div className="mt-1 text-xl font-semibold text-white">{k.val}</div>
          </div>
        ))}
      </section>

      {/* 숙련도 (mastery) */}
      <section>
        <h2 className="text-sm font-mono tracking-wider text-slate-500 mb-3">숙련도 — p(mastered)</h2>
        {mastery.length === 0 ? (
          <p className="rounded-sm border border-slate-800 bg-slate-900/30 px-4 py-6 text-sm text-slate-400">
            아직 학습 기록이 없습니다. <span className="text-amber-300">▶ 데모 사이클 한 바퀴</span>를 눌러 채점→진단을 돌려보세요.
          </p>
        ) : (
          <div className="space-y-2">
            {mastery.map((m) => {
              const c = bucketColor(m.score);
              return (
                <div key={m.conceptId} className="flex items-center gap-3 rounded-sm border border-slate-800 bg-slate-900/30 px-4 py-2.5">
                  <div className="w-40 shrink-0">
                    <div className="text-sm text-white truncate">{m.concept.name}</div>
                    <div className="text-[11px] text-slate-500">{m.concept.domain ?? '기타'} · 관측 {m.observationCount}</div>
                  </div>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${c.bar}`} style={{ width: `${Math.round(m.score * 100)}%` }} />
                  </div>
                  <div className={`w-28 text-right text-sm font-medium ${c.text}`}>
                    {Math.round(m.score * 100)}% <span className="text-[11px] text-slate-500">{masteryLabel(m.score)}</span>
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
          <h2 className="text-sm font-mono tracking-wider text-slate-500 mb-3">최근 워크시트 (공급→채점)</h2>
          <div className="space-y-2">
            {worksheets.length === 0 ? (
              <p className="text-sm text-slate-500">없음</p>
            ) : (
              worksheets.map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-sm border border-slate-800 bg-slate-900/30 px-3 py-2 text-sm">
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-sm border ${
                    w.status === 'GRADED' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                    : w.status === 'SUBMITTED' ? 'border-sky-500/30 text-sky-300 bg-sky-500/10'
                    : 'border-slate-600/40 text-slate-400 bg-slate-700/10'
                  }`}>{w.status}</span>
                  <span className="text-slate-300">{w._count.problems}문항</span>
                  {w.submission && <span className="text-slate-500">· 채점 {w.submission._count.items}</span>}
                  <span className="ml-auto text-[11px] text-slate-600 font-mono">{w.id.slice(-6)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 리포트 */}
        <section>
          <h2 className="text-sm font-mono tracking-wider text-slate-500 mb-3">최근 리포트 (보고)</h2>
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-500">없음 — 위 버튼으로 생성</p>
            ) : (
              reports.map((r) => {
                const isParent = r.type === 'PARENT';
                const headline = isParent
                  ? `종합 ${jval(r.summary, ['overall']) ?? '-'}`
                  : `숙련 ${jval(r.summary, ['stats', 'mastered']) ?? 0} · 약점 ${jval(r.summary, ['stats', 'weak']) ?? 0} · 평균 ${Math.round(Number(jval(r.summary, ['stats', 'avgScore']) ?? 0) * 100)}%`;
                return (
                  <div key={r.id} className="rounded-sm border border-slate-800 bg-slate-900/30 px-3 py-2 text-sm">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-sm border ${isParent ? 'border-emerald-500/30 text-emerald-300' : 'border-violet-500/30 text-violet-300'}`}>
                      {isParent ? '학부모' : '원장'}
                    </span>
                    <span className="ml-2 text-slate-300">{headline}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* 파이프라인 상태 */}
      <section>
        <h2 className="text-sm font-mono tracking-wider text-slate-500 mb-3">5단계 파이프라인 (전체 자동화 완료)</h2>
        <div className="overflow-hidden rounded-sm border border-slate-800">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800">
              {STAGES.map((s) => (
                <tr key={s.key} className="hover:bg-slate-900/50">
                  <td className="px-4 py-2 font-medium text-white w-16">{s.key}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{s.io}</td>
                  <td className="px-4 py-2 text-xs text-slate-300">{s.impl}</td>
                  <td className="px-4 py-2 w-20">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-sm border ${s.mode === 'AUTO' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-slate-600/40 text-slate-400'}`}>
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
