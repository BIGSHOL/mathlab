/**
 * 로그인 V2 — data/refact/pages/landing-auth-hifi.html S2 변형 (B 카드)
 * 선생/학원장 로그인 + SNS 빠른 시작. 학생은 학원 코드로 가입.
 */
import Link from 'next/link';
import '@/styles/v2-pages/auth.css';

export default function LoginV2Page() {
  return (
    <div className="auth-stage">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="mk">M</span>
          <span className="name">MathLAB</span>
        </div>
        <h2>로그인</h2>
        <div className="desc">학원장/선생님 계정으로 로그인합니다</div>

        <div className="role-tabs">
          <Link href="/v2/join" className="role-tab" style={{ textDecoration: 'none' }}>
            <span className="ic">🎓</span>학생
          </Link>
          <div className="role-tab on">
            <span className="ic">👨‍🏫</span>선생
          </div>
          <div className="role-tab">
            <span className="ic">🏫</span>학원장
          </div>
        </div>

        <div className="auth-field">
          <label>이메일 또는 휴대폰</label>
          <div className="wrap">
            <span className="ic">✉️</span>
            <input type="text" className="input with-icon" defaultValue="park@gangnam-math.co.kr" />
          </div>
        </div>

        <div className="auth-field">
          <label>비밀번호</label>
          <div className="wrap">
            <span className="ic">🔒</span>
            <input type="password" className="input with-icon" defaultValue="placeholder12345" />
          </div>
        </div>

        <div className="row" style={{ marginBottom: 18, fontSize: 12, display: 'flex', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked /> 자동 로그인
          </label>
          <span className="spacer" style={{ flex: 1 }} />
          <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>비밀번호 찾기</a>
        </div>

        <button className="lp-btn primary" style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: 14 }}>
          로그인
        </button>

        <div className="divider">또는 SNS로 빠른 시작</div>

        <div className="social-row">
          <button className="social-btn kakao">💬 카카오</button>
          <button className="social-btn naver"><b style={{ color: '#fff' }}>N</b> 네이버</button>
          <button className="social-btn google">🌐 Google</button>
        </div>

        <div className="legal">
          아직 계정이 없으신가요? <Link href="/v2/onboarding" style={{ fontWeight: 700 }}>학원 등록 →</Link><br />
          <span style={{ marginTop: 6, display: 'inline-block' }}>
            학생이라면 → <a href="#">학원 코드로 가입</a>
          </span>
        </div>
      </div>
    </div>
  );
}
