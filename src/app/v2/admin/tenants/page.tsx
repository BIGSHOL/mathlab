/**
 * 관리자 학원(테넌트) 관리 V1 — data/refact/pages/admin-hifi.html S1 변형
 * 좌측 마스터(테이블) + 우측 드로어(상세).
 */
import { AppShell, Sidebar, Topbar, ADMIN_NAV } from '@/components/layout-v2';
import { Button } from '@/components/ui-v2';
import '@/styles/v2-pages/admin.css';

// TODO: Prisma — Tenant + TenantLicense + 활성 학생/MRR 집계
const MOCK = {
  admin: { name: '관리자 김', meta: 'Super Admin', avatarBg: '#6366F1' },
  totals: { all: 247, live: 218, trial: 23, suspended: 6 },
  kpi: [
    { lb: '총 학원', v: '247', meta: '▲ 12 · 이번 달', metaColor: 'up' as const },
    { lb: '활성 (Live)', v: '218', vSmall: '/247', meta: '88.3%' },
    { lb: '체험 중', v: '23', meta: '▲ 5 · 전환예정 8', metaColor: 'up' as const },
    { lb: 'MRR', v: '₩42.8M', meta: '▲ 8.4% · 전월비', metaColor: 'up' as const },
    { lb: '활성 학생', v: '8,432', meta: '▲ 384 · 7일', metaColor: 'up' as const },
  ],
  filters: [
    { label: '전체 247', on: true },
    { label: '활성 218' },
    { label: '체험 23' },
    { label: '정지 6' },
  ],
  rows: [
    { selected: true, init: '강', bg: 'linear-gradient(135deg,#3B5BDB,#1E3A8A)', name: '강남수학학원', sub: '박선생 외 4명 · 서울 강남', plan: 'Pro', planTone: 'live', state: '● Live', stateTone: 'live', students: 128, teachers: 5, mrr: '₩680K', spark: '0,28 14,26 28,22 42,20 56,16 70,14 84,8 100,6', sparkColor: '#22C55E', activity: '방금 전', activityColor: 'success' as const },
    { init: '대', bg: 'linear-gradient(135deg,#10B981,#065F46)', name: '대치수학연구소', sub: '김원장 · 서울 강남', plan: 'Pro+', planTone: 'live', state: '● Live', stateTone: 'live', students: 312, teachers: 12, mrr: '₩1.4M', spark: '0,24 14,22 28,18 42,18 56,14 70,10 84,8 100,6', sparkColor: '#22C55E', activity: '2분 전', activityColor: 'success' as const },
    { init: '분', bg: 'linear-gradient(135deg,#F59E0B,#B45309)', name: '분당명문학원', sub: '이원장 · 경기 성남', plan: 'Pro', planTone: 'live', state: '● Live', stateTone: 'live', students: 186, teachers: 8, mrr: '₩920K', spark: '0,20 14,18 28,16 42,12 56,10 70,8 84,10 100,8', sparkColor: '#22C55E', activity: '5분 전', activityColor: 'success' as const },
    { init: '목', bg: 'linear-gradient(135deg,#8B5CF6,#5B21B6)', name: '목동수학전문학원', sub: '최선생 · 서울 양천', plan: 'Trial', planTone: 'trial', state: '○ Trial · 23일 남음', stateTone: 'trial', students: 42, teachers: 2, mrr: '—', spark: '0,30 14,28 28,22 42,20 56,18 70,16 84,14 100,12', sparkColor: '#3B5BDB', activity: '1시간 전' },
    { init: '중', bg: 'linear-gradient(135deg,#EC4899,#831843)', name: '중계동수학과학원', sub: '정원장 · 서울 노원', plan: 'Basic', planTone: 'live', state: '● Live', stateTone: 'live', students: 68, teachers: 3, mrr: '₩280K', spark: '0,16 14,18 28,16 42,20 56,18 70,22 84,24 100,22', sparkColor: '#F59E0B', activity: '3시간 전' },
    { init: '송', bg: 'linear-gradient(135deg,#06B6D4,#0E7490)', name: '송파수학교실', sub: '한선생 · 서울 송파', plan: 'Pro', planTone: 'live', state: '⏸ 정지 · 결제 실패', stateTone: 'suspended', students: 92, studentsMuted: true, teachers: 4, teachersMuted: true, mrr: '미수금 ₩540K', mrrColor: 'danger' as const, spark: '0,12 14,14 28,16 42,18 56,22 70,26 84,28 100,30', sparkColor: '#DC2626', activity: '3일 전', activityColor: 'danger' as const },
  ],
  detail: {
    init: '강',
    bg: 'linear-gradient(135deg,#3B5BDB,#1E3A8A)',
    name: '강남수학학원',
    crumbs: '서울 강남 · 사업자 123-45-6789',
    plan: 'Pro',
    status: '● Live · 8개월',
    metrics: [
      { lb: '학생', v: '128', delta: '▲ 14', deltaColor: 'success' as const },
      { lb: '월 MRR', v: '₩680K', delta: '▲ ₩40K', deltaColor: 'success' as const },
      { lb: '사용량', v: '82%', delta: '128/150' },
    ],
    info: [
      ['대표 관리자', '박선생 (010-****-5678)'],
      ['계약 시작', '2024년 9월 1일'],
      ['결제일', '매월 1일 · 자동결제'],
      ['다음 갱신', '2025년 9월 1일'],
      ['사용 학교 DB', '강남구 26개교'],
    ],
    activeFeatures: [
      { label: '학습분석 v2', tone: 'solid' as const },
      { label: 'AI 예측', tone: 'solid' as const },
      { label: '사진 채점', tone: 'solid' as const },
      { label: '베타 — 학습지 AI' },
    ],
  },
};

export default function AdminTenantsV2Page() {
  const data = MOCK;
  return (
    <AppShell
      className="admin"
      sidebar={
        <Sidebar
          brand="MathLAB · Admin"
          groups={ADMIN_NAV}
          user={{ name: data.admin.name, meta: data.admin.meta, avatarBg: data.admin.avatarBg }}
        />
      }
    >
      <Topbar
        title="학원 관리"
        subtitle={<span>총 <b>{data.totals.all}</b>개 학원</span>}
        right={
          <>
            <input className="search-input" style={{ width: 240 }} placeholder="🔍 학원명·관리자·전화번호" />
            <Button>📥 CSV 내보내기</Button>
            <Button variant="primary">＋ 새 학원</Button>
          </>
        }
      />

      <div className="drawer-shell">
        <div className="main" style={{ overflowY: 'auto' }}>
          {/* KPI summary */}
          <div className="summary-grid">
            {data.kpi.map((k, i) => (
              <div key={i} className="summary-card">
                <div className="lb">{k.lb}</div>
                <div className="v">
                  {k.v}
                  {k.vSmall && <small style={{ fontSize: 13, color: 'var(--ink-3)' }}> {k.vSmall}</small>}
                </div>
                <div className="meta">
                  {k.metaColor === 'up' ? <b className="up">{k.meta}</b> : k.meta}
                </div>
              </div>
            ))}
          </div>

          {/* filter */}
          <div className="filter-bar">
            <span className="text-3" style={{ fontSize: 11, fontWeight: 700 }}>상태:</span>
            {data.filters.map((f, i) => (
              <span key={i} className={`f-chip${f.on ? ' on' : ''}`}>{f.label}</span>
            ))}
            <span className="spacer" />
            <span className="text-3" style={{ fontSize: 11 }}>정렬:</span>
            <Button style={{ fontSize: 11, padding: '4px 10px' }}>최근 가입 ▾</Button>
          </div>

          {/* table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}><span className="check" /></th>
                  <th>학원</th>
                  <th>플랜</th>
                  <th>상태</th>
                  <th className="r">학생</th>
                  <th className="r">선생</th>
                  <th className="r">MRR</th>
                  <th>이용 추세</th>
                  <th className="c">최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i} className={r.selected ? 'selected' : undefined}>
                    <td><span className={`check${r.selected ? ' on' : ''}`} /></td>
                    <td>
                      <div className="row gap-10" style={{ alignItems: 'center' }}>
                        <div className="tenant-logo" style={{ background: r.bg }}>{r.init}</div>
                        <div>
                          <div className="nm">{r.name}</div>
                          <div className="sub">{r.sub}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`admin-pill ${r.planTone}`}>{r.plan}</span></td>
                    <td><span className={`admin-pill ${r.stateTone}`}>{r.state}</span></td>
                    <td className="r" style={r.studentsMuted ? { color: 'var(--ink-3)' } : undefined}>{r.students}</td>
                    <td className="r" style={r.teachersMuted ? { color: 'var(--ink-3)' } : undefined}>{r.teachers}</td>
                    <td className="r" style={r.mrrColor === 'danger' ? { color: 'var(--danger)' } : undefined}>{r.mrr}</td>
                    <td>
                      <svg className="mini-spark" viewBox="0 0 100 36" preserveAspectRatio="none">
                        <polyline fill="none" stroke={r.sparkColor} strokeWidth={2} points={r.spark} />
                      </svg>
                    </td>
                    <td className="c">
                      <span style={{ fontSize: 11, color: r.activityColor === 'success' ? 'var(--success)' : r.activityColor === 'danger' ? 'var(--danger)' : undefined }}>
                        {r.activity}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={9} style={{ padding: 14, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
                    240개 더보기 · <a href="#" style={{ color: 'var(--primary)', fontWeight: 700 }}>전체 보기</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* drawer: tenant detail */}
        <div className="drawer">
          <div className="row" style={{ marginBottom: 6, alignItems: 'center', gap: 10 }}>
            <div className="tenant-logo" style={{ width: 44, height: 44, background: data.detail.bg, fontSize: 17 }}>{data.detail.init}</div>
            <div>
              <h3 style={{ margin: 0 }}>{data.detail.name}</h3>
              <div className="crumbs">{data.detail.crumbs}</div>
            </div>
          </div>
          <div className="row gap-6 mb-12">
            <span className="admin-pill live">{data.detail.plan}</span>
            <span className="admin-pill live">{data.detail.status}</span>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>📊 현재 상태</h4>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {data.detail.metrics.map((m, i) => (
                <div key={i} style={{ flex: 1, minWidth: 90, background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 700 }}>{m.lb}</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{m.v}</div>
                  <div style={{ fontSize: 10, color: m.deltaColor === 'success' ? 'var(--success)' : 'var(--ink-3)' }}>{m.delta}</div>
                </div>
              ))}
            </div>
          </div>

          <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>기본 정보</h4>
          {data.detail.info.map(([k, v]) => (
            <div key={k} className="kv">
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}

          <h4 style={{ margin: '18px 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>⚡ 활성 기능</h4>
          <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
            {data.detail.activeFeatures.map((f, i) => (
              <span key={i} className={`tg${f.tone === 'solid' ? ' solid' : ''}`} style={{ fontSize: 10 }}>{f.label}</span>
            ))}
          </div>

          <div className="row gap-6" style={{ marginTop: 18 }}>
            <Button style={{ flex: 1, fontSize: 12 }}>로그인 대신하기</Button>
            <Button variant="primary" style={{ flex: 1, fontSize: 12 }}>상세 보기</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
