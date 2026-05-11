/**
 * 학생 대시보드 V2 — Hi-Fi 변환 (data/refact/pages/student-dashboard-hifi.html · V2 블록)
 *
 * 변환 절차:
 *   1) sample tsx (data/refact/handoff/sample-student-dashboard-page.tsx) 베이스
 *   2) ./dashboard.css import 제거 (mathlab-v2.css 는 globals.css 에서 import됨)
 *   3) 인라인 StudentSidebar / NAV_ITEMS → @/components/layout-v2 사용
 *   4) Stat 카드들 → StatTile 컴포넌트
 *   5) Topbar 마크업 → Topbar 컴포넌트
 *
 * MOCK 데이터. // TODO: Prisma 표시로 교체 지점 명시.
 */
import { AppShell, Sidebar, Topbar, STUDENT_NAV } from '@/components/layout-v2';
import { Button, Card, CardHead, Chip, ProgressBar, StatTile } from '@/components/ui-v2';

// ==============================================================
// MOCK DATA — 추후 Prisma + NextAuth getServerSession() 로 교체
// ==============================================================

const MOCK = {
  user: {
    name: '이서연',
    grade: '중3 1학기',
    level: 12,
    coins: 2450,
    avatarBg: 'linear-gradient(135deg,#A78BFA,#7C3AED)',
  },
  // TODO: Prisma — Submission.where({ userId, createdAt: { gte: 28일 전 } })
  stats: {
    totalStudyTime: { hours: 14, minutes: 32, delta: '+2시간 ↑' },
    solvedProblems: { total: 487, correct: 401, wrong: 86 },
    accuracy: { value: 82, classAvg: 76 },
    score: { value: 1940, rank: '반 3등' },
  },
  todayGoal: { solved: 15, target: 20 },
  // TODO: Prisma — Concept.where({ gradeId }) join Mastery
  unitMastery: [
    { id: 'real-num', name: '실수와 그 계산', status: 'done' as const, accuracy: 94, progress: '30/30' },
    { id: 'poly-mul', name: '다항식의 곱셈', status: 'done' as const, accuracy: 88, progress: '25/25' },
    { id: 'quadratic-eq', name: '이차방정식', status: 'active' as const, accuracy: 82, progress: '18/27', percent: 65 },
    { id: 'quadratic-fn', name: '이차함수 그래프', status: 'active' as const, accuracy: 76, progress: '11/30', percent: 35 },
    { id: 'similarity', name: '삼각형의 닮음', status: 'pending' as const, note: '선생님 진도 따라' },
    { id: 'circle', name: '원의 성질', status: 'weak' as const, accuracy: 52, note: '정답률 52% · 보충 추천', percent: 52 },
    { id: 'stats', name: '통계', status: 'pending' as const, note: '2학기 진도' },
    { id: 'prob', name: '확률', status: 'pending' as const, note: '2학기 진도' },
  ],
};

// ==============================================================
// PAGE
// ==============================================================

export default function StudentDashboardV2Page() {
  // TODO: const session = await getServerSession(authOptions);
  // TODO: const data = await fetchDashboard(session.user.id);
  const data = MOCK;

  return (
    <AppShell
      sidebar={
        <Sidebar
          groups={STUDENT_NAV}
          user={{
            name: data.user.name,
            meta: `Lv.${data.user.level} · 🪙 ${data.user.coins.toLocaleString()}`,
            avatarBg: data.user.avatarBg,
          }}
        />
      }
    >
      <Topbar
        title="학습 현황"
        subtitle={`최근 4주 · ${data.user.grade}`}
        right={
          <>
            <Button>7일</Button>
            <Button variant="primary">4주</Button>
            <Button>학기</Button>
          </>
        }
      />

      <div className="main">
        <StatHeader stats={data.stats} />
        <DailyTrend goal={data.todayGoal} />
        <UnitMastery units={data.unitMastery} />
      </div>
    </AppShell>
  );
}

// ==============================================================
// SECTIONS
// ==============================================================

function StatHeader({ stats }: { stats: typeof MOCK.stats }) {
  return (
    <div className="grid grid-4">
      <StatTile
        label="총 학습 시간"
        value={stats.totalStudyTime.hours}
        valueUnit={`시 ${stats.totalStudyTime.minutes}분`}
        delta={stats.totalStudyTime.delta}
      />
      <StatTile
        label="푼 문제"
        value={stats.solvedProblems.total}
        delta={`정답 ${stats.solvedProblems.correct} · 오답 ${stats.solvedProblems.wrong}`}
      />
      <StatTile
        label="정답률"
        value={stats.accuracy.value}
        valueUnit="%"
        delta={`반 평균 ${stats.accuracy.classAvg}% (+${stats.accuracy.value - stats.accuracy.classAvg})`}
      />
      <StatTile
        label="획득 점수"
        value={stats.score.value.toLocaleString()}
        delta={stats.score.rank}
        deltaColor="neutral"
      />
    </div>
  );
}

function DailyTrend({ goal }: { goal: typeof MOCK.todayGoal }) {
  const percent = Math.round((goal.solved / goal.target) * 100);
  const circumference = 2 * Math.PI * 64;
  const dashOffset = circumference * (1 - percent / 100);

  return (
    <div className="grid mt-16" style={{ gridTemplateColumns: '2fr 1fr' }}>
      <Card>
        <CardHead
          title="일별 학습 추이"
          right={
            <div className="row text-3" style={{ gap: 12 }}>
              <span className="row" style={{ gap: 4 }}>
                <span style={{ width: 8, height: 8, background: 'var(--primary)', borderRadius: 99 }} />
                푼 문제
              </span>
              <span className="row" style={{ gap: 4 }}>
                <span style={{ width: 8, height: 8, background: 'var(--gold)', borderRadius: 99 }} />
                정답률
              </span>
            </div>
          }
        />
        {/* TODO: Recharts <BarChart> + <LineChart> 로 교체 — 데이터는 props */}
        <svg className="spark" viewBox="0 0 600 180" preserveAspectRatio="none" style={{ height: 180 }}>
          <line x1="0" y1="40" x2="600" y2="40" stroke="#F1F5F9" />
          <line x1="0" y1="80" x2="600" y2="80" stroke="#F1F5F9" />
          <line x1="0" y1="120" x2="600" y2="120" stroke="#F1F5F9" />
          <line x1="0" y1="160" x2="600" y2="160" stroke="#F1F5F9" />
          <g fill="#3B5BDB" opacity={0.85}>
            {Array.from({ length: 14 }, (_, i) => {
              const h = 40 + (i * 7);
              return (
                <rect
                  key={i}
                  x={20 + i * 42}
                  y={160 - h}
                  width={20}
                  height={h}
                  rx={3}
                />
              );
            })}
          </g>
        </svg>
        <div className="row between text-3 mt-8" style={{ padding: '0 4px' }}>
          <span>4주 전</span>
          <span>3주 전</span>
          <span>2주 전</span>
          <span>이번주</span>
        </div>
      </Card>

      <Card>
        <CardHead title="오늘 목표" />
        <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0' }}>
          <svg width={160} height={160} viewBox="0 0 160 160">
            <circle cx={80} cy={80} r={64} fill="none" stroke="#F1F5F9" strokeWidth={14} />
            <circle
              cx={80} cy={80} r={64}
              fill="none"
              stroke="#3B5BDB"
              strokeWidth={14}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
            />
            <text x={80} y={76} textAnchor="middle" fontSize={32} fontWeight={800} fill="#0F172A">
              {percent}
              <tspan fontSize={16} fill="#64748B">%</tspan>
            </text>
            <text x={80} y={98} textAnchor="middle" fontSize={11} fill="#64748B">
              {goal.solved} / {goal.target} 문제
            </text>
          </svg>
        </div>
        <div className="row between mt-8 text-2">
          <span>{goal.target - goal.solved}문제 더!</span>
          <Button variant="primary">계속하기</Button>
        </div>
      </Card>
    </div>
  );
}

function UnitMastery({ units }: { units: typeof MOCK.unitMastery }) {
  const doneCount = units.filter(u => u.status === 'done').length;

  return (
    <Card className="mt-16">
      <CardHead
        title="단원별 마스터리"
        right={
          <span className="text-3">
            중3 · {units.length}개 단원 · <strong style={{ color: 'var(--ink)' }}>{doneCount}</strong>개 완료
          </span>
        }
      />
      <div className="grid grid-4">
        {units.map(u => <UnitCard key={u.id} unit={u} />)}
      </div>
    </Card>
  );
}

function UnitCard({ unit }: { unit: typeof MOCK.unitMastery[number] }) {
  const styles: Record<typeof unit.status, React.CSSProperties> = {
    done:    { border: '1px solid var(--success)', background: 'var(--success-bg)', padding: 14 },
    active:  { border: '1px solid var(--primary-200)', background: 'var(--primary-50)', padding: 14 },
    pending: { padding: 14 },
    weak:    { border: '1px solid var(--danger)', background: 'var(--danger-bg)', padding: 14 },
  };
  const chip = {
    done:    <Chip tone="success">완료</Chip>,
    active:  <Chip tone="indigo">진행중</Chip>,
    pending: <Chip tone="gray">대기</Chip>,
    weak:    <Chip tone="danger">약점</Chip>,
  }[unit.status];

  return (
    <div className="card flat" style={styles[unit.status]}>
      <div className="row between">
        <span style={{ fontWeight: 600 }}>{unit.name}</span>
        {chip}
      </div>

      {unit.status === 'done' && (
        <div className="text-3 mt-8">정답률 {unit.accuracy}% · {unit.progress}</div>
      )}

      {unit.status === 'active' && unit.percent != null && (
        <>
          <div className="mt-8">
            <ProgressBar value={unit.percent} />
          </div>
          <div className="text-3 mt-8">정답률 {unit.accuracy}% · {unit.progress}</div>
        </>
      )}

      {unit.status === 'weak' && unit.percent != null && (
        <>
          <div className="pbar mt-8" style={{ background: '#FECACA' }}>
            <i style={{ width: `${unit.percent}%`, background: 'var(--danger)', display: 'block', height: '100%', borderRadius: 99 }} />
          </div>
          <div className="text-3 mt-8">{unit.note}</div>
        </>
      )}

      {unit.status === 'pending' && (
        <>
          <div className="pbar mt-8"><i style={{ width: 0 }} /></div>
          <div className="text-3 mt-8">{unit.note}</div>
        </>
      )}
    </div>
  );
}
