/**
 * 관리자 학교 DB V2 — data/refact/pages/admin-hifi.html S2 변형
 * 전국 학교 + 기출 보유 현황 + 커버리지 통계 (no-side 풀스크린).
 */
import { AppShell, SidebarV2, Topbar, ADMIN_NAV } from '@/components/layout';
import { ButtonV2 } from '@/components/ui';
import '@/styles/v2-pages/admin.css';

// TODO: Prisma — School + ExamPaper 집계 (cover/missing 통계 포함)
const MOCK = {
  admin: { name: '관리자 김', meta: 'Super Admin', avatarBg: '#6366F1' },
  kpi: [
    { lb: '등록 학교', v: '5,832', meta: '중학교 3,124 + 고등학교 2,708' },
    { lb: '데이터 보유', v: '1,247', vSmall: '/5,832', meta: '▲ 21.4% 커버리지', metaColor: 'up' as const },
    { lb: '시험지', v: '12,832', meta: '▲ 142 · 이번주', metaColor: 'up' as const },
    { lb: '총 문항', v: '320K', meta: '평균 25문/시험' },
    { lb: '검토 대기', v: '47', vColor: 'warn' as const, meta: '평균 처리 2일' },
  ],
  regions: [
    { label: '전체', on: true },
    { label: '서울 124' },
    { label: '경기 198' },
    { label: '인천 42' },
    { label: '부산 76' },
    { label: '+18 지역' },
  ],
  levels: [
    { label: '중학교', on: true },
    { label: '고등학교' },
  ],
  rows: [
    { init: '대', bg: 'linear-gradient(135deg,#3B5BDB,#1E3A8A)', name: '대치중학교', sub: '공립 · 2024 신학기 등록', area: '서울 강남구', papers: 32, qs: 800, ours: '12명', upload: '5/9 · 2024-1 중간', status: '완비', statusTone: 'live', owner: '권리포터' },
    { init: '청', bg: 'linear-gradient(135deg,#10B981,#065F46)', name: '청담중학교', sub: '공립', area: '서울 강남구', papers: 28, qs: 700, ours: '8명', upload: '4/30 · 2023-2 기말', status: '완비', statusTone: 'live', owner: '권리포터' },
    { init: '개', bg: 'linear-gradient(135deg,#F59E0B,#B45309)', name: '개원중학교', sub: '공립', area: '서울 강남구', papers: 24, qs: 600, ours: '5명', upload: '4/22 · 2023-2 기말', status: '부족', statusTone: 'trial', owner: '알바김' },
    { init: '압', bg: 'linear-gradient(135deg,#EC4899,#831843)', name: '압구정중학교', sub: '공립', area: '서울 강남구', papers: 20, qs: 500, ours: '3명', upload: '5/2 · 2024-1 중간', status: '완비', statusTone: 'live', owner: '알바김' },
    { init: '방', bg: 'linear-gradient(135deg,#94A3B8,#475569)', name: '방배중학교', sub: '공립 · 2024 신규 추가', area: '서울 서초구', papers: 6, papersMuted: true, qs: 150, qsMuted: true, ours: '—', oursMuted: true, upload: '미수집', uploadMuted: true, status: '결손', statusTone: 'suspended', owner: '미배정', ownerMuted: true },
    { init: '목', bg: 'linear-gradient(135deg,#06B6D4,#0E7490)', name: '목일중학교', sub: '공립', area: '서울 양천구', papers: 18, qs: 450, ours: '7명', upload: '4/15 · 2023-2 기말', status: '완비', statusTone: 'live', owner: '권리포터' },
  ],
};

export default function AdminSchoolsV2Page() {
  const data = MOCK;
  return (
    <AppShell
      className="admin"
      sidebar={
        <SidebarV2
          brand="MathLAB · Admin"
          groups={ADMIN_NAV}
          user={{ name: data.admin.name, meta: data.admin.meta, avatarBg: data.admin.avatarBg }}
        />
      }
    >
      <Topbar
        title="학교 DB"
        subtitle={<span>전국 <b>5,832</b>교 · <b>1,247</b>교 데이터 보유</span>}
        right={
          <>
            <input className="search-input" style={{ width: 240 }} placeholder="🔍 학교명·지역" />
            <ButtonV2>📥 일괄 업로드</ButtonV2>
            <ButtonV2 variant="primary">＋ 학교 추가</ButtonV2>
          </>
        }
      />

      <div className="main">
        {/* KPI */}
        <div className="summary-grid">
          {data.kpi.map((k, i) => (
            <div key={i} className="summary-card">
              <div className="lb">{k.lb}</div>
              <div className="v" style={k.vColor === 'warn' ? { color: 'var(--warn)' } : undefined}>
                {k.v}
                {k.vSmall && <small>{k.vSmall}</small>}
              </div>
              <div className="meta">
                {k.metaColor === 'up' ? <b className="up">{k.meta}</b> : k.meta}
              </div>
            </div>
          ))}
        </div>

        {/* filter */}
        <div className="filter-bar">
          <span className="text-3" style={{ fontSize: 11, fontWeight: 700 }}>지역:</span>
          {data.regions.map((r, i) => (
            <span key={i} className={`f-chip${r.on ? ' on' : ''}`}>{r.label}</span>
          ))}
          <span className="spacer" />
          <span className="text-3" style={{ fontSize: 11, fontWeight: 700 }}>학교급:</span>
          {data.levels.map((l, i) => (
            <span key={i} className={`f-chip${l.on ? ' on' : ''}`}>{l.label}</span>
          ))}
        </div>

        {/* table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>학교</th>
                <th>지역</th>
                <th className="r">시험지</th>
                <th className="r">문항</th>
                <th className="r">우리 학원생</th>
                <th>최근 업로드</th>
                <th className="c">상태</th>
                <th className="c">담당</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <div className="row gap-10" style={{ alignItems: 'center' }}>
                      <div className="tenant-logo" style={{ background: r.bg }}>{r.init}</div>
                      <div>
                        <div className="nm">{r.name}</div>
                        <div className="sub">{r.sub}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.area}</td>
                  <td className="r" style={r.papersMuted ? { color: 'var(--ink-3)' } : undefined}>{r.papers}</td>
                  <td className="r" style={r.qsMuted ? { color: 'var(--ink-3)' } : undefined}>{r.qs}</td>
                  <td className="r" style={r.oursMuted ? { color: 'var(--ink-3)' } : { color: 'var(--primary)', fontWeight: 800 }}>{r.ours}</td>
                  <td><span style={{ fontSize: 11, color: r.uploadMuted ? 'var(--ink-3)' : undefined }}>{r.upload}</span></td>
                  <td className="c"><span className={`admin-pill ${r.statusTone}`}>{r.status}</span></td>
                  <td className="c"><span style={{ fontSize: 11, color: r.ownerMuted ? 'var(--ink-3)' : undefined }}>{r.owner}</span></td>
                </tr>
              ))}
              <tr>
                <td colSpan={8} style={{ padding: 14, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
                  1,241개 더보기 · 페이지 1 / 105 · <a href="#" style={{ color: 'var(--primary)', fontWeight: 700 }}>전체 보기</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
