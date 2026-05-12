/**
 * 학생 마켓(환전) V2 — data/refact/pages/student-market-hifi.html V2 변형
 * 환전하기 — 포인트(P) → 매스머니(M) 슬라이더 + 환율 + 거래 내역.
 */
import { AppShell, SidebarV2, Topbar, STUDENT_NAV } from '@/components/layout';
import { ButtonV2 } from '@/components/ui';

// TODO: Prisma — StudentProfile.points + PointTransaction + 환율 설정
const MOCK = {
  user: { name: '이서연', level: 12, coins: 2450 },
  exchange: {
    fromBalance: 2450, fromAmount: 2000,
    toBalance: 1200, toAmount: 1000,
    rateP: 2, rateM: 1, fee: '무료', minP: 100,
    tierBonus: '골드 등급 이상은 +5% (실효 환율 1.9 : 1)',
  },
  history: [
    { type: '환전', date: '4/22 14:30', deltaP: -1000, deltaM: 500 },
    { type: '마켓 구매: 노트', date: '4/17 16:42', deltaM: -300 },
    { type: '시험 보상', date: '4/15 19:00', deltaP: 250 },
  ],
  notes: [
    '환율은 매월 1일 학원이 고시 (인플레이션 방지)',
    '매스머니는 마켓데이에만 사용 가능',
    '학년말 잔여 매스머니는 다음 학기로 이월',
    '퇴원 시 매스머니는 소멸 (포인트는 환전 가능)',
  ],
};

export default function StudentShopV2Page() {
  const data = MOCK;
  const newToBalance = data.exchange.toBalance + data.exchange.toAmount;

  return (
    <AppShell
      sidebar={
        <SidebarV2
          groups={STUDENT_NAV}
          user={{ name: data.user.name, meta: `Lv.${data.user.level} · 🪙 ${data.user.coins.toLocaleString()} P` }}
        />
      }
    >
      <Topbar
        title="환전"
        subtitle="포인트를 매스머니로 변환합니다 · 매스머니는 환불 불가"
        right={<ButtonV2>‹ 마켓으로</ButtonV2>}
      />

      <div className="main">
        <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
          {/* 환전 계산기 */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 18px' }}>💱 환전 계산기</h3>

            {/* from */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
              <div className="row between">
                <span className="text-3">보낼 금액</span>
                <span className="text-3">잔고: <b style={{ color: 'var(--ink)' }}>{data.exchange.fromBalance.toLocaleString()} P</b></span>
              </div>
              <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  defaultValue={data.exchange.fromAmount.toLocaleString()}
                  style={{ border: 'none', background: 'transparent', fontSize: 36, fontWeight: 800, width: 160, outline: 'none', color: 'var(--primary)' }}
                />
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-3)' }}>P · 학습 포인트</span>
              </div>
              <div className="row gap-4 mt-8">
                <ButtonV2 style={{ fontSize: 11, padding: '4px 10px' }}>25%</ButtonV2>
                <ButtonV2 style={{ fontSize: 11, padding: '4px 10px' }}>50%</ButtonV2>
                <ButtonV2 style={{ fontSize: 11, padding: '4px 10px' }}>최대</ButtonV2>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 24, color: 'var(--primary)' }}>↓</div>

            {/* to */}
            <div style={{ background: 'linear-gradient(135deg,var(--primary-50),var(--gold-bg))', border: '2px solid var(--primary)', borderRadius: 14, padding: 18 }}>
              <div className="row between">
                <span className="text-3">받을 금액</span>
                <span className="text-3">현재 잔고: <b style={{ color: 'var(--ink)' }}>{data.exchange.toBalance.toLocaleString()} M</b></span>
              </div>
              <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--ink)' }}>+ {data.exchange.toAmount.toLocaleString()}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-3)' }}>M · 매스머니</span>
              </div>
              <div className="text-3 mt-8">
                환전 후 잔고: <b style={{ color: 'var(--ink)', fontSize: 13 }}>{newToBalance.toLocaleString()} M</b>
              </div>
            </div>

            {/* rate info */}
            <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--line)', borderRadius: 10, padding: '12px 14px', marginTop: 18 }}>
              <div className="row between"><span className="text-3">현재 환율</span><b>{data.exchange.rateP} P = {data.exchange.rateM} M</b></div>
              <div className="row between"><span className="text-3">수수료</span><b style={{ color: 'var(--success)' }}>{data.exchange.fee}</b></div>
              <div className="row between"><span className="text-3">최소 환전</span><b>{data.exchange.minP} P</b></div>
            </div>

            <ButtonV2 variant="primary" size="xl" className="mt-16" style={{ width: '100%', fontWeight: 800 }}>
              {data.exchange.fromAmount.toLocaleString()} P → {data.exchange.toAmount.toLocaleString()} M 환전하기
            </ButtonV2>
            <div className="text-3 mt-8" style={{ textAlign: 'center' }}>
              ⚠️ 환전 후 포인트로 되돌릴 수 없습니다
            </div>
          </div>

          {/* 우측 */}
          <div className="col gap-12">
            <div className="card">
              <div className="card-head"><h3>📊 이번 달 환율</h3></div>
              <div style={{ textAlign: 'center', padding: '14px 0' }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: 'var(--primary)' }}>{data.exchange.rateP} : {data.exchange.rateM}</div>
                <div className="text-3">P (포인트) → M (매스머니)</div>
              </div>
              <div style={{ background: 'var(--gold-bg)', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: 'var(--gold-dark)' }}>
                ⭐ <b>등급 보너스</b>: {data.exchange.tierBonus}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>🕐 최근 거래</h3><span className="more">전체 →</span></div>
              <div className="col gap-4">
                {data.history.map((h, i) => (
                  <div
                    key={i}
                    className="row between"
                    style={{ padding: '8px 0', borderBottom: i < data.history.length - 1 ? '1px dashed var(--line-2)' : 'none' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{h.type}</div>
                      <div className="text-3">{h.date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {h.deltaP != null && (
                        <div style={{ color: h.deltaP < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                          {h.deltaP > 0 ? '+' : ''}{h.deltaP.toLocaleString()} P
                        </div>
                      )}
                      {h.deltaM != null && (
                        <div className="text-3" style={{ color: h.deltaM < 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {h.deltaM > 0 ? '+' : ''}{h.deltaM.toLocaleString()} M
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: 'var(--bg)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 8px' }}>💡 알아두기</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                {data.notes.map(n => <li key={n}>{n}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
