/**
 * 선생님 대시보드 V1 — data/refact/pages/teacher-dashboard-hifi.html V1 변형
 * 트리아지 — 위험 학생 우선 + KPI 4개 + 오늘 일정 + 우수 학생.
 */
import { AppShell, Sidebar, Topbar, TEACHER_NAV } from '@/components/layout-v2';
import { Button, Chip, StatTile } from '@/components/ui-v2';
import '@/styles/v2-pages/teacher-dashboard.css';

// TODO: Prisma — Classroom + Student + risk-score 집계
type Severity = 'danger' | 'warn' | 'info';
type ChipTone = 'danger' | 'warn' | 'gray' | 'success' | 'indigo';

const MOCK = {
  teacher: { name: '박선생', branch: '강남수학학원', avatarBg: 'linear-gradient(135deg,#3B5BDB,#1E3A8A)' },
  classInfo: { className: '중2A', size: 32, date: '5월 4일 (월)' },
  kpi: [
    { label: '오늘 활동 학생', value: 28, unit: ' / 32', delta: '▲ 어제 +3' },
    { label: '위험 학생', value: 4, danger: true, delta: '▲ 어제 +1' },
    { label: '숙제 미완료', value: 7, delta: '2명 마감 D-1', deltaColor: 'warn' as const },
    { label: '평균 정답률', value: 76, unit: '%', delta: '▲ 지난주 +2.4%p' },
  ],
  triage: [
    { initial: '현', avBg: 'linear-gradient(135deg,#DC2626,#7F1D1D)', name: '박현우', meta: 'Lv.8 · 중2A', reason: '3일째 미접속 · 지난주 정답률 -25%p', signals: [{ tone: 'danger' as ChipTone, label: '미접속 3일' }, { tone: 'warn' as ChipTone, label: '숙제 2건 미완료' }, { tone: 'gray' as ChipTone, label: '이차방정식 47%' }], severity: 'danger' as Severity, actions: ['상세', '📨 메시지'] },
    { initial: '지', avBg: 'linear-gradient(135deg,#F97316,#9A3412)', name: '이지원', meta: 'Lv.10 · 중2A', reason: '이차방정식 단원 정답률 32% · 진단 권장', signals: [{ tone: 'danger' as ChipTone, label: '약점 단원 누적' }, { tone: 'gray' as ChipTone, label: '최근 시험 58점' }], severity: 'danger' as Severity, actions: ['진단', '+ 보충'] },
    { initial: '민', avBg: 'linear-gradient(135deg,#F59E0B,#B45309)', name: '김민서', meta: 'Lv.12 · 중2A', reason: '최근 1주일 학습 시간 -40% · 동기 저하 의심', signals: [{ tone: 'warn' as ChipTone, label: '학습량 급감' }, { tone: 'gray' as ChipTone, label: '정답률 71%' }], severity: 'warn' as Severity, actions: ['상세', '학부모 알림'] },
    { initial: '윤', avBg: 'linear-gradient(135deg,#06B6D4,#0E7490)', name: '이윤재', meta: 'Lv.13 · 중2A', reason: '레벨 대비 정답률 우수 · 상위 단원 추천', signals: [{ tone: 'indigo' as ChipTone, label: '레벨업 후보' }, { tone: 'success' as ChipTone, label: '정답률 94%' }], severity: 'info' as Severity, actions: ['상위반 추천'] },
  ],
  schedule: [
    { time: '15:00', event: '중2A 정규수업 · 이차방정식', tone: 'default' as const },
    { time: '17:00', event: '중2B 정규수업 · 함수', tone: 'success' as const },
    { time: '19:30', event: '단원평가 채점 마감', tone: 'warn' as const },
    { time: '21:00', event: '학부모 상담 (지원 어머님)', tone: 'default' as const },
  ],
  topStudents: [
    { initial: '김', avBg: 'linear-gradient(135deg,#FBBF24,#B45309)', name: '김도연', meta: '2,580 P · Lv.15', rank: '🏆 1위', tone: 'gold' as ChipTone | 'gold' },
    { initial: '박', avBg: 'linear-gradient(135deg,#94A3B8,#475569)', name: '박지호', meta: '2,140 P · Lv.14', rank: '2위', tone: 'gray' as const },
    { initial: '서', avBg: 'linear-gradient(135deg,#A78BFA,#7C3AED)', name: '이서연', meta: '1,820 P · Lv.12', rank: '3위', tone: 'gray' as const },
  ],
};

export default function TeacherDashboardV2Page() {
  const data = MOCK;

  return (
    <AppShell
      sidebar={
        <Sidebar
          groups={TEACHER_NAV}
          user={{ name: data.teacher.name, meta: data.teacher.branch, avatarBg: data.teacher.avatarBg }}
        />
      }
    >
      <Topbar
        title={
          <button className="class-pill">
            <span className="dot" />
            <span>{data.classInfo.className} · {data.classInfo.size}명</span>
            <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>▾</span>
          </button>
        }
        subtitle={`${data.classInfo.date} · 담당 ${data.classInfo.size}명`}
        right={
          <>
            <Button>🔍 검색</Button>
            <Button>🔔 알림</Button>
            <Button variant="primary">＋ 새 숙제</Button>
          </>
        }
      />

      <div className="main">
        {/* KPI ROW */}
        <div className="grid grid-4 mt-8">
          {data.kpi.map((k, i) => (
            <div
              key={i}
              className="card"
              style={k.danger ? { borderColor: '#FECACA', background: 'var(--danger-bg)' } : undefined}
            >
              <div className="stat">
                <div className="label" style={k.danger ? { color: 'var(--danger)' } : undefined}>{k.label}</div>
                <div className="value" style={k.danger ? { color: 'var(--danger)' } : undefined}>
                  {k.value}
                  {k.unit && (
                    <span style={{ fontSize: 14, color: k.danger ? 'var(--danger)' : 'var(--ink-3)', fontWeight: 600 }}>
                      {k.unit}
                    </span>
                  )}
                </div>
                <div
                  className="delta"
                  style={k.danger ? { color: 'var(--danger)' } : k.deltaColor === 'warn' ? { color: 'var(--warn)' } : undefined}
                >
                  {k.delta}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TRIAGE + side */}
        <div className="grid mt-24" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          <div>
            <div className="card-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ 우선 확인 필요 <Chip tone="danger">{data.triage.length}명</Chip>
              </h3>
              <span className="more">전체 보기 →</span>
            </div>
            <div className="col" style={{ gap: 10 }}>
              {data.triage.map((t, i) => (
                <div key={i} className={`triage-card ${t.severity}`}>
                  <div className="av" style={{ background: t.avBg }}>{t.initial}</div>
                  <div>
                    <div className="name">{t.name} <span className="text-3">· {t.meta}</span></div>
                    <div className="reason">{t.reason}</div>
                    <div className="signals">
                      {t.signals.map((s, j) => <Chip key={j} tone={s.tone}>{s.label}</Chip>)}
                    </div>
                  </div>
                  <div className="col" style={{ gap: 6 }}>
                    {t.actions.map((a, j) => (
                      <Button
                        key={j}
                        variant={j === 0 ? 'primary' : 'default'}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        {a}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* side */}
          <div className="col" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <h3>📅 오늘 일정</h3>
                <span className="more">캘린더</span>
              </div>
              <div>
                {data.schedule.map((s, i) => (
                  <div key={i} className="schedule-row">
                    <div className="time">{s.time}</div>
                    <div className={`ev${s.tone !== 'default' ? ' ' + s.tone : ''}`}>{s.event}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>⭐ 이번 주 우수</h3>
                <span className="more">랭킹</span>
              </div>
              <div className="col" style={{ gap: 8 }}>
                {data.topStudents.map((s, i) => (
                  <div key={i} className="row">
                    <div className="av" style={{ background: s.avBg }}>{s.initial}</div>
                    <div style={{ flex: 1 }}>
                      <div className="bold">{s.name}</div>
                      <div className="text-3">{s.meta}</div>
                    </div>
                    <span className={`chip ${s.tone}`}>{s.rank}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
