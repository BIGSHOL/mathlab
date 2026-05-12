/**
 * 온보딩 V3 — data/refact/pages/landing-auth-hifi.html S3 변형
 * 학원장 가입 후 5단계 셋업 (현재 Step 3 / 5 — 첫 반 생성).
 */
import '@/styles/v2-pages/auth.css';

const SUBJECT_PICKS = [
  { ico: '📐', nm: '인수분해', sub: '중2 1학기', on: true },
  { ico: '📊', nm: '이차방정식', sub: '중2 1학기' },
  { ico: '📈', nm: '이차함수', sub: '중2 2학기' },
  { ico: '🔢', nm: '통계', sub: '중2 2학기' },
];

export default function OnboardingV2Page() {
  return (
    <div className="onb-shell">
      {/* progress */}
      <div className="onb-progress">
        <div className="onb-step-bar done" />
        <div className="onb-step-bar done" />
        <div className="onb-step-bar active" />
        <div className="onb-step-bar" />
        <div className="onb-step-bar" />
      </div>

      <div className="onb-frame">
        <div className="onb-step-num">STEP 3 / 5</div>
        <h3>첫 번째 반을 만들어볼까요?</h3>
        <div className="desc">
          반은 학생을 묶는 단위입니다. 시간표나 학년/레벨로 나누면 좋아요.<br />
          나중에 언제든 더 만들 수 있고, 한 학생이 여러 반에 속해도 됩니다.
        </div>

        <div className="onb-field">
          <label>반 이름</label>
          <input type="text" className="onb-input" defaultValue="중2 A반 (월·수·금 7시)" placeholder="예: 중2 A반 / 고1 심화반 / 화목 6시반" />
        </div>

        <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="onb-field" style={{ margin: 0 }}>
            <label>학년</label>
            <select className="onb-input" defaultValue="중학교 2학년">
              <option>중학교 1학년</option>
              <option>중학교 2학년</option>
              <option>중학교 3학년</option>
              <option>고등학교 1학년</option>
            </select>
          </div>
          <div className="onb-field" style={{ margin: 0 }}>
            <label>레벨</label>
            <select className="onb-input" defaultValue="표준">
              <option>기초</option>
              <option>표준</option>
              <option>심화</option>
              <option>특별 (영재/올림피아드)</option>
            </select>
          </div>
        </div>

        <div className="onb-field">
          <label>📚 시작 단원</label>
          <div className="onb-pick" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {SUBJECT_PICKS.map((s, i) => (
              <div key={i} className={`opt${s.on ? ' on' : ''}`} style={{ padding: '14px 8px' }}>
                <span className="ic" style={{ fontSize: 22 }}>{s.ico}</span>
                <div className="nm" style={{ fontSize: 12 }}>{s.nm}</div>
                <div className="sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="onb-field">
          <label>학생 초대 코드 (자동 생성됨)</label>
          <div className="copy-code">
            <div className="code">K M L 3 9 7</div>
            <button className="btn-copy">📋 복사</button>
          </div>
          <div className="text-3" style={{ fontSize: 11, lineHeight: 1.6 }}>
            💡 다음 단계에서 이 코드를 학생들에게 카톡으로 보내거나 인쇄해서 나눠주세요.<br />
            학생은 mathlab.app/join 에서 코드만 입력하면 바로 가입됩니다.
          </div>
        </div>

        <div className="onb-foot">
          <button className="btn-skip">← 이전</button>
          <span className="spacer" style={{ flex: 1 }} />
          <button className="btn-skip">건너뛰기 (나중에)</button>
          <button className="lp-btn primary" style={{ padding: '11px 22px' }}>반 만들고 학생 초대하기 →</button>
        </div>
      </div>
    </div>
  );
}
