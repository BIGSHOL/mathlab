/**
 * 학생 연산연습 V2 — data/refact/pages/student-practice-hifi.html V2 변형
 * 분할 보기 — 왼쪽 문제 + 손글씨 / 오른쪽 키패드 (Apple Pencil 친화).
 *
 * 사이드바 없이 전체 화면을 사용하는 풀스크린 풀이 모드.
 */
import { Button, Chip } from '@/components/ui-v2';
import '@/styles/v2-pages/student-practice.css';

// TODO: Prisma — Question.find + ArithmeticAttempt 진행 상태
const MOCK = {
  question: {
    num: 13,
    total: 20,
    timeLeft: '19:08',
    difficulty: '★★★★☆',
    exp: 12,
    stemHtml: <>
      이차방정식 <span className="formula">x² − (k+2)x + 2k = 0</span> 의 두 근의 차가{' '}
      <span className="formula">3</span> 일 때, 실수 <span className="formula">k</span> 의 값을 모두 구하시오.
    </>,
  },
  answer: { typed: '−1, 5' },
  hint: { remaining: 1, message: '두 근의 차 공식부터 시작해보세요' },
};

export default function StudentPracticeV2Page() {
  const data = MOCK;

  return (
    <div className="split">
      {/* 왼쪽: 문제 + 손글씨 영역 */}
      <div className="q-pane">
        <div className="row between">
          <div>
            <div className="row gap-12">
              <Chip tone="warn">주관식</Chip>
              <Chip tone="gray">난이도 {data.question.difficulty}</Chip>
              <Chip tone="gold">+{data.question.exp} EXP</Chip>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>
              문제 {data.question.num}.
            </h2>
          </div>
          <div className="col" style={{ alignItems: 'flex-end' }}>
            <span className="qclock">⏱ {data.question.timeLeft}</span>
            <span className="text-3 mt-8">{data.question.num} / {data.question.total}</span>
          </div>
        </div>

        <div className="qbody mt-16">
          <div className="stem">{data.question.stemHtml}</div>
        </div>

        {/* 손글씨 캔버스 영역 */}
        <div style={{ marginTop: 16 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>
              ✏️ 풀이 공간 <span className="text-3" style={{ fontWeight: 500 }}>(태블릿: Apple Pencil)</span>
            </span>
            <div className="row gap-4">
              <Button style={{ padding: '5px 10px' }}>↶</Button>
              <Button style={{ padding: '5px 10px' }}>↷</Button>
              <Button style={{ padding: '5px 10px' }}>🧹 지우기</Button>
            </div>
          </div>
          <div
            style={{
              height: 280,
              background: 'repeating-linear-gradient(0deg, transparent 0 31px, var(--line-2) 31px 32px), #FFFEF9',
              border: '1px solid var(--line)',
              borderRadius: 12,
              position: 'relative',
              padding: 16,
            }}
          >
            {/* TODO: implement — Canvas/Pencil 입력 + AI 인식 채점 */}
            <svg viewBox="0 0 600 250" style={{ width: '100%', height: '100%' }}>
              <text x="20" y="36" fontFamily="Caveat, cursive" fontSize="24" fill="#1E40AF">α + β = k+2,   αβ = 2k</text>
              <text x="20" y="80" fontFamily="Caveat, cursive" fontSize="24" fill="#1E40AF">(α - β)² = (α+β)² - 4αβ</text>
              <text x="20" y="124" fontFamily="Caveat, cursive" fontSize="24" fill="#1E40AF">9 = (k+2)² - 8k</text>
              <text x="20" y="168" fontFamily="Caveat, cursive" fontSize="24" fill="#1E40AF">k² - 4k - 5 = 0</text>
              <text x="20" y="212" fontFamily="Caveat, cursive" fontSize="24" fill="#DC2626">∴ k = ?</text>
            </svg>
          </div>
          <div className="text-3 mt-8" style={{ textAlign: 'center' }}>
            🤖 AI가 풀이를 자동 인식해서 채점합니다
          </div>
        </div>
      </div>

      {/* 오른쪽: 키패드 */}
      <div className="key-pane">
        <div>
          <div className="row between">
            <span style={{ fontWeight: 700, fontSize: 13 }}>정답 입력</span>
            <span className="text-3">수식 키패드</span>
          </div>
          <div className="answer-input mt-8">
            <span className="formula">k =</span>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{data.answer.typed}</span>
            <span className="caret" />
          </div>
          <div className="text-3 mt-8">쉼표로 여러 답 입력 가능</div>
        </div>

        <div className="keypad">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'].map(k => (
            <div key={k} className="key">{k}</div>
          ))}
          <div className="key op">−</div>
          <div className="key fn">x²</div>
          <div className="key fn">√</div>
          <div className="key fn">π</div>
          <div className="key fn">a/b</div>
          <div className="key fn">(  )</div>
          <div className="key fn">±</div>
          <div className="key del">⌫ 지움</div>
          <div className="key">,</div>
          <div className="key op">=</div>
          <div className="key submit">제출하기 →</div>
        </div>

        <div style={{ marginTop: 'auto', padding: 12, background: 'var(--gold-bg)', borderRadius: 10 }}>
          <div className="row gap-12">
            <div style={{ fontSize: 24 }}>💡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gold-dark)' }}>
                힌트 사용 (💎 {data.hint.remaining})
              </div>
              <div className="text-3">{data.hint.message}</div>
            </div>
            <Button
              style={{
                padding: '5px 10px',
                fontSize: 12,
                background: 'var(--gold)',
                borderColor: 'var(--gold-dark)',
                color: '#78350F',
              }}
            >
              사용
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
