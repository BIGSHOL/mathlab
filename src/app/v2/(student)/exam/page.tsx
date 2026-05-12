/**
 * 학생 시험 로비 V1 — data/refact/pages/student-exam-hifi.html V1 변형
 * 시험 로비 — 예정 · 응시 가능 · 완료 시험 한눈에.
 */
import { AppShell, SidebarV2, Topbar, STUDENT_NAV } from '@/components/layout';
import { ButtonV2, Chip, CurrencyChip } from '@/components/ui';
import '@/styles/v2-pages/student-exam.css';

// TODO: Prisma — Test + TestAssignment + TestAttempt
const MOCK = {
  user: { name: '이서연', level: 12, coins: 2450 },
  live: {
    title: '이차방정식 단원 평가',
    meta: '중3-A · 김선생님 · 30문항 · 60분',
    warn: '시작하면 60분 타이머가 카운트다운 됩니다. 중간 이탈은 자동 제출입니다.',
    chips: [{ tone: 'danger' as const, label: '🔴 LIVE' }, { tone: 'gray' as const, label: '단원 평가' }],
  },
  upcoming: [
    { title: '5월 모의 중간고사', date: '5/12(수) 19:00 · 25문항 · 80분', icon: '📚', tip: '대비 추천: 이차방정식, 인수분해, 곱셈공식', button: '대비 학습 시작', chips: [{ tone: 'gold' as const, label: 'D-8' }, { tone: 'gray' as const, label: '중간고사 모의' }], upcoming: true },
    { title: '이차함수 형성 평가', date: '5/19(수) 19:00 · 20문항 · 50분', icon: '🧪', tip: '📌 단원학습 진도 완료 후 응시 가능', button: '대비 학습 (잠김)', disabled: true, chips: [{ tone: 'gray' as const, label: 'D-15' }, { tone: 'gray' as const, label: '형성 평가' }] },
  ],
  completed: [
    { name: '곱셈공식 단원 평가', date: '5/2 · 김선생님', score: 88, rank: '3 / 24', rankTone: 'success' as const, classAvg: '반 평균 76' },
    { name: '실수와 그 계산 평가', date: '4/25 · 김선생님', score: 94, rank: '2 / 24', rankTone: 'success' as const },
    { name: '3월 진단 평가', date: '3/8 · 김선생님', score: 72, rank: '7 / 24', rankTone: 'warn' as const, scoreColor: 'var(--warn)' },
  ],
};

export default function StudentExamV2Page() {
  const data = MOCK;

  return (
    <AppShell
      sidebar={
        <SidebarV2
          groups={STUDENT_NAV}
          user={{ name: data.user.name, meta: `Lv.${data.user.level} · 🪙 ${data.user.coins.toLocaleString()}` }}
        />
      }
    >
      <Topbar
        title="시험"
        subtitle={`예정 ${data.upcoming.length} · 응시 가능 1 · 완료 ${data.completed.length}`}
        right={
          <>
            <CurrencyChip kind="streak" value={12} />
            <CurrencyChip kind="coin" value={2450} />
          </>
        }
      />

      <div className="main">
        {/* LIVE */}
        <h3 style={{ fontSize: 13, color: 'var(--danger)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🔴 지금 응시 가능
        </h3>
        <div className="exam-lobby-card live">
          <div className="row between">
            <div className="row gap-12">
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--danger)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 24 }}>🧪</div>
              <div>
                <div className="row gap-4">
                  {data.live.chips.map((c, i) => <Chip key={i} tone={c.tone}>{c.label}</Chip>)}
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, marginTop: 4 }}>{data.live.title}</div>
                <div className="text-3 mt-8">{data.live.meta}</div>
              </div>
            </div>
            <ButtonV2 variant="primary" size="xl">🔴 응시 시작</ButtonV2>
          </div>
          <div style={{ background: 'var(--danger-bg)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--danger)' }}>
            ⚠️ {data.live.warn}
          </div>
        </div>

        {/* UPCOMING */}
        <h3 style={{ fontSize: 13, color: 'var(--ink-3)', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📅 예정
        </h3>
        <div className="grid grid-2">
          {data.upcoming.map((e, i) => (
            <div key={i} className={`exam-lobby-card${e.upcoming ? ' upcoming' : ''}`}>
              <div className="row between">
                <div>
                  <div className="row gap-4">
                    {e.chips.map((c, j) => <Chip key={j} tone={c.tone}>{c.label}</Chip>)}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>{e.title}</div>
                  <div className="text-3 mt-8">{e.date}</div>
                </div>
                <div style={{ fontSize: 32 }}>{e.icon}</div>
              </div>
              <div
                style={
                  e.upcoming
                    ? { background: 'var(--gold-bg)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }
                    : { fontSize: 12, color: 'var(--ink-3)' }
                }
              >
                {e.upcoming ? <>💡 <b>{e.tip}</b></> : e.tip}
              </div>
              {e.disabled ? <ButtonV2 disabled>{e.button}</ButtonV2> : <ButtonV2>{e.button}</ButtonV2>}
            </div>
          ))}
        </div>

        {/* COMPLETED */}
        <h3 style={{ fontSize: 13, color: 'var(--ink-3)', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ✅ 완료 (최근 {data.completed.length})
        </h3>
        <div className="card" style={{ padding: 0 }}>
          <div className="topic-row" style={{ padding: '14px 18px', background: 'var(--bg)', borderRadius: '12px 12px 0 0', fontWeight: 700, fontSize: 12, color: 'var(--ink-3)' }}>
            <span>시험명</span>
            <span>점수</span>
            <span>등수</span>
            <span />
          </div>
          {data.completed.map((c, i) => (
            <div key={i} className="topic-row" style={{ padding: '14px 18px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div className="text-3">{c.date}</div>
              </div>
              <div>
                <span style={{ fontWeight: 800, fontSize: 18, color: c.scoreColor || 'var(--success)' }}>
                  {c.score}
                </span>
                <span className="text-3"> / 100</span>
              </div>
              <div>
                <Chip tone={c.rankTone}>{c.rank}</Chip>
                {c.classAvg && <> <span className="text-3">{c.classAvg}</span></>}
              </div>
              <ButtonV2>리포트</ButtonV2>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
