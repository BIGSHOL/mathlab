/**
 * v2 디자인 시스템 토큰/CSS import 검증용 단순 페이지
 *
 * 접근: /(dev)/_preview-v2
 * 목적: mathlab-v2.css 가 globals.css 를 거쳐 로드되는지,
 *       :root alias 가 정상 매핑되는지를 한 화면으로 확인.
 *       Phase 2 에서 전체 컴포넌트 프리뷰로 확장됨.
 */
export default function PreviewV2Page() {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        v2 디자인 시스템 — 토큰 검증
      </h1>
      <p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>
        mathlab-v2.css 와 globals.css 토큰이 정상 동작하는지 확인하는 페이지입니다.
      </p>

      <div className="row" style={{ gap: 12, marginBottom: 24 }}>
        <span className="chip indigo">indigo</span>
        <span className="chip navy">navy</span>
        <span className="chip success">success</span>
        <span className="chip warn">warn</span>
        <span className="chip danger">danger</span>
        <span className="chip gray">gray</span>
        <span className="chip gold">gold</span>
        <span className="chip gem">gem</span>
        <span className="chip epic">epic</span>
      </div>

      <div className="row" style={{ gap: 12, marginBottom: 24 }}>
        <button className="btn">기본 버튼</button>
        <button className="btn primary">Primary</button>
        <button className="btn gold">Gold</button>
        <button className="btn ghost">Ghost</button>
        <button className="btn primary lg">Large Primary</button>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="card stat">
          <div className="label">총 학습 시간</div>
          <div className="value">14<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>시</span></div>
          <div className="delta">+2시간 ↑</div>
        </div>
        <div className="card stat">
          <div className="label">정답률</div>
          <div className="value">82<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>%</span></div>
          <div className="delta">반 평균 76%</div>
        </div>
        <div className="card stat">
          <div className="label">획득 점수</div>
          <div className="value">1,940</div>
          <div className="delta">반 3등</div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 24 }}>
        <span className="tier bronze">Bronze</span>
        <span className="tier silver">Silver</span>
        <span className="tier gold">Gold</span>
        <span className="tier plat">Plat</span>
        <span className="tier diamond">Diamond</span>
        <span className="tier master">Master</span>
        <span className="tier legend">Legend</span>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head">
          <h3>Progress 검증</h3>
        </div>
        <div className="pbar mt-8"><i style={{ width: '40%' }} /></div>
        <div className="pbar gold mt-8 lg"><i style={{ width: '65%' }} /></div>
        <div className="pbar xp mt-8"><i style={{ width: '80%' }} /></div>
      </div>

      <div className="row" style={{ gap: 12 }}>
        <span className="mt-currency streak">🔥 7일</span>
        <span className="mt-currency coin">🪙 2,450</span>
        <span className="mt-currency gem">💎 48</span>
        <span className="mt-currency heart">❤ 5</span>
      </div>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--line)' }} />

      <p style={{ color: 'var(--ink-3)', fontSize: 12 }}>
        모든 요소가 인디고/골드/시안 톤으로 정상 표시되면 Phase 1 검증 완료.
      </p>
    </div>
  );
}
