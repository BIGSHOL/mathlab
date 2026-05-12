/**
 * 선생님 시험 V3 — data/refact/pages/teacher-exam-hifi.html V3 변형
 * 수동 채점 — 서술형 사진 채점 + 동일오답 일괄 처리.
 * 풀스크린 (사이드바 없음).
 */
import { AppShell, Topbar } from '@/components/layout-v2';
import { Button, Chip } from '@/components/ui-v2';
import '@/styles/v2-pages/teacher-exam.css';

const MOCK = {
  progress: 38,
  students: [
    { initial: '도', avBg: 'linear-gradient(135deg,#FBBF24,#B45309)', name: '김도연', sub: '중2A · 1번', state: 'done' as const, score: '5/5' },
    { initial: '윤', avBg: 'linear-gradient(135deg,#06B6D4,#0E7490)', name: '이윤재', sub: '중2A · 2번', state: 'done' as const, score: '5/5' },
    { initial: '지', avBg: 'linear-gradient(135deg,#F97316,#9A3412)', name: '이지원', sub: '중2A · 3번 — 채점 중', state: 'partial' as const, score: '3/5', active: true },
    { initial: '예', avBg: 'linear-gradient(135deg,#EC4899,#831843)', name: '황예린', sub: '중2A · 4번', state: 'todo' as const, score: '0/5' },
    { initial: '현', avBg: 'linear-gradient(135deg,#DC2626,#7F1D1D)', name: '박현우', sub: '중2A · 5번', state: 'todo' as const, score: '0/5' },
    { initial: '건', avBg: 'linear-gradient(135deg,#94A3B8,#475569)', name: '강건우', sub: '중2A · 6번', state: 'todo' as const, score: '0/5' },
    { initial: '민', avBg: 'linear-gradient(135deg,#F59E0B,#B45309)', name: '김민서', sub: '중2A · 7번', state: 'partial' as const, score: '2/5' },
    { initial: '서', avBg: 'linear-gradient(135deg,#10B981,#065F46)', name: '최서진', sub: '중2A · 8번', state: 'todo' as const, score: '0/5' },
    { initial: '하', avBg: 'linear-gradient(135deg,#8B5CF6,#5B21B6)', name: '정하늘', sub: '중2A · 9번', state: 'todo' as const, score: '0/5' },
    { initial: '우', avBg: 'linear-gradient(135deg,#3B5BDB,#1E3A8A)', name: '한도우', sub: '중2A · 10번', state: 'done' as const, score: '5/5' },
  ],
  current: { initial: '지', avBg: 'linear-gradient(135deg,#F97316,#9A3412)', name: '이지원', sub: '중2A · 3번', autoScore: '15/19 정답 (60점)' },
  // OMR sample data
  omrRows: [
    { qn: 1, marks: [null, 'correct', null, null, null] },
    { qn: 2, marks: ['correct', null, null, null, null] },
    { qn: 3, marks: [null, 'correct', null, null, null] },
    { qn: 4, marks: [null, null, 'wrong', null, null] },
    { qn: 5, marks: [null, null, null, 'correct', null] },
    { qn: 6, marks: [null, null, 'correct', null, null] },
  ],
};

export default function TeacherExamV2Page() {
  const data = MOCK;

  return (
    <AppShell sidebar={null} noSide>
      <Topbar
        title={<a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none', fontSize: 13 }}>← 5월 모의고사</a>}
        subtitle={<span style={{ fontWeight: 700, fontSize: 14 }}>수동 채점 — <b style={{ color: 'var(--warn)' }}>서술형 5문항 × 60명</b></span>}
        right={
          <>
            <div className="row gap-4">
              <span className="text-3" style={{ fontSize: 12 }}>진행률 {data.progress}%</span>
              <div style={{ width: 120, height: 8, background: 'var(--line-2)', borderRadius: 99, overflow: 'hidden' }}>
                <i style={{ display: 'block', width: `${data.progress}%`, height: '100%', background: 'var(--warn)' }} />
              </div>
            </div>
            <Button>↩ 자동 저장됨</Button>
            <Button variant="primary">완료 & 공개</Button>
          </>
        }
      />

      <div className="grade-shell">
        {/* LEFT: 학생 리스트 */}
        <div className="stu-list">
          <h4>학생 60명 — 진행 상태</h4>
          <div className="row" style={{ padding: '0 14px 8px', gap: 6 }}>
            <Button variant="ghost" style={{ fontSize: 11, padding: '4px 8px' }}>전체</Button>
            <Button variant="ghost" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--warn)' }}>미채점 36</Button>
            <Button variant="ghost" style={{ fontSize: 11, padding: '4px 8px' }}>완료 24</Button>
          </div>
          {data.students.map((s, i) => (
            <div key={i} className={`stu-row${s.active ? ' active' : ''}`}>
              <div className="av" style={{ background: s.avBg }}>{s.initial}</div>
              <div className="lb">
                <div className="nm">{s.name}</div>
                <div className="st">{s.sub}</div>
              </div>
              <div className={`pgs ${s.state}`}>{s.score}</div>
            </div>
          ))}
          <div className="text-3 center" style={{ fontSize: 11, padding: 8 }}>… 49명 더보기</div>
        </div>

        {/* CENTER: 채점 패널 */}
        <div className="grade-pane">
          <div className="row" style={{ marginBottom: 14, alignItems: 'center' }}>
            <div className="av" style={{ width: 42, height: 42, background: data.current.avBg, color: '#fff', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
              {data.current.initial}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                {data.current.name} <span className="text-3" style={{ fontSize: 13, fontWeight: 400 }}>{data.current.sub}</span>
              </h3>
              <div className="text-3" style={{ fontSize: 12 }}>
                객관식 19문항 자동 채점 완료 — <b style={{ color: 'var(--success)' }}>{data.current.autoScore}</b> · 서술형 6문항 채점 중
              </div>
            </div>
            <span style={{ flex: 1 }} />
            <Button variant="ghost">← 이전</Button>
            <Button>다음 학생 →</Button>
          </div>

          {/* Q20: 부분점수 케이스 */}
          <div className="answer-block partial">
            <div className="qhead">
              <span className="qnum">20번</span>
              <div className="bold" style={{ flex: 1 }}>두 근의 합이 5, 곱이 -6일 때 이차방정식을 구하시오 (서술)</div>
              <span className="text-3" style={{ fontSize: 11 }}>배점 6점</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div className="text-3" style={{ fontSize: 11, marginBottom: 4, fontWeight: 700 }}>학생 답안 (사진)</div>
                <div className="student-answer handwriting" style={{ background: 'linear-gradient(transparent 95%, #cbd5e1 95%)', backgroundSize: '100% 22px', padding: 12, minHeight: 120 }}>
                  두 근의 합 = 5<br />
                  두 근의 곱 = -6<br />
                  x² - 5x - 6 = 0<br />
                  <span style={{ color: 'var(--danger)' }}>∴ x² - 5x - 6 = 0</span>
                </div>
              </div>
              <div>
                <div className="text-3" style={{ fontSize: 11, marginBottom: 4, fontWeight: 700 }}>채점 가이드</div>
                <div className="student-answer">학생 답안 사실 정답이나 풀이 과정에서 곱·합 부호 표기 혼란.<br />부분점수 4/6 권장.</div>
              </div>
            </div>
            <div className="row between" style={{ marginTop: 14, alignItems: 'center' }}>
              <div className="quick-marks">
                <button type="button" className="full">○ 정답 6점</button>
                <button type="button" className="half">△ 부분 4점</button>
                <button type="button" className="half">△ 부분 2점</button>
                <button type="button" className="zero">✕ 0점</button>
              </div>
              <div className="score-input partial">
                점수 <input type="text" defaultValue="4" /> / 6
              </div>
            </div>
            <div className="feedback-chips">
              <span className="text-3" style={{ fontSize: 11, fontWeight: 700 }}>자주 쓰는 피드백 →</span>
              <span className="fb-chip">+ 풀이 과정 명확</span>
              <span className="fb-chip">+ 결과는 맞으나 표기 부정확</span>
              <span className="fb-chip">+ 부호 실수 주의</span>
            </div>
          </div>

          {/* Q21: 동일오답 일괄 케이스 */}
          <div className="answer-block wrong">
            <div className="qhead">
              <span className="qnum">21번</span>
              <div className="bold" style={{ flex: 1 }}>실생활 응용 — 정원의 둘레 (서술)</div>
              <span className="text-3" style={{ fontSize: 11 }}>배점 8점</span>
              <span className="conflict-pin">⚠ 동일오답 12명</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div className="text-3" style={{ fontSize: 11, marginBottom: 4, fontWeight: 700 }}>학생 답안 (사진)</div>
                <div className="student-answer handwriting" style={{ background: 'linear-gradient(transparent 95%, #cbd5e1 95%)', backgroundSize: '100% 22px', padding: 12, minHeight: 120 }}>
                  가로 = x, 세로 = 12-x<br />
                  x(12-x) = 32<br />
                  x² - 12x + 32 = 0<br />
                  (x-4)(x-8) = 0<br />
                  <span style={{ color: 'var(--danger)' }}>∴ x = 4 또는 8</span>
                </div>
              </div>
              <div>
                <div style={{ background: 'var(--warn-bg)', border: '1px solid #FED7AA', borderRadius: 8, padding: 12 }}>
                  <div className="bold" style={{ fontSize: 13, color: 'var(--warn)' }}>🔄 동일 풀이 패턴 12명</div>
                  <div className="text-3" style={{ fontSize: 11, margin: '6px 0 10px' }}>
                    이지원 + 11명이 &quot;x = 4 또는 8 둘 다&quot;라고 답했습니다. 가로&gt;세로 조건 누락. 일괄로 같은 점수·피드백 적용 가능.
                  </div>
                  <div className="row gap-4">
                    <Button variant="primary" style={{ fontSize: 12, flex: 1 }}>12명에 일괄 적용</Button>
                    <Button style={{ fontSize: 12 }}>개별 채점</Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="row between" style={{ marginTop: 14, alignItems: 'center' }}>
              <div className="quick-marks">
                <button type="button" className="full">○ 정답 8점</button>
                <button type="button" className="half">△ 부분 6점</button>
                <button type="button" className="half">△ 부분 4점</button>
                <button type="button" className="zero">✕ 0점</button>
              </div>
              <div className="score-input partial">
                점수 <input type="text" defaultValue="6" /> / 8
              </div>
            </div>
          </div>

          {/* Q25 pending */}
          <div className="answer-block pending">
            <div className="qhead">
              <span className="qnum">25번</span>
              <div className="bold" style={{ flex: 1 }}>[킬러] 두 근의 차로 a 구하기</div>
              <span className="text-3" style={{ fontSize: 11 }}>배점 10점</span>
              <Chip tone="gem">미채점</Chip>
            </div>
            <div className="text-3" style={{ fontSize: 12, textAlign: 'center', padding: 24 }}>
              ↓ 클릭해 사진 답안 보기
            </div>
          </div>
        </div>

        {/* RIGHT: OMR */}
        <div className="grade-side">
          <h4 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            OMR — 객관식 19문항
          </h4>
          <div className="text-3" style={{ fontSize: 11, marginBottom: 10 }}>자동 채점됨 · ✓ 정답 ✕ 오답</div>
          <div className="omr-grid">
            {data.omrRows.map(r => (
              <>
                <span key={`qn-${r.qn}`} className="qn">{r.qn}</span>
                {r.marks.map((m, i) => (
                  <span
                    key={`${r.qn}-${i}`}
                    className={`omr-bubble${m ? ` ${m}-mark` : ''}`}
                  >
                    {['①', '②', '③', '④', '⑤'][i]}
                  </span>
                ))}
              </>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
