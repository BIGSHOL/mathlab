/**
 * 선생님 학생 관리 V2 — data/refact/pages/teacher-students-hifi.html V2 변형
 * 마스터-디테일 — 좌측 학생 목록 + 우측 학생 상세 (개념별 숙지도 + 활동 타임라인 + AI 추천).
 */
import { AppShell, Sidebar, Topbar, TEACHER_NAV } from '@/components/layout-v2';
import { Button, Chip } from '@/components/ui-v2';
import '@/styles/v2-pages/teacher-students.css';

type Tone = 'danger' | 'warn' | 'gold' | 'gray' | 'indigo' | 'success';

const MOCK = {
  teacher: { name: '박선생', branch: '강남수학학원', avatarBg: 'linear-gradient(135deg,#3B5BDB,#1E3A8A)' },
  classInfo: { className: '중2A', size: 32 },
  filters: [{ label: '전체', active: true }, { label: '위험 4' }, { label: '우수 9' }],
  students: [
    { initial: '현', avBg: 'linear-gradient(135deg,#DC2626,#7F1D1D)', name: '박현우', tag: { tone: 'danger' as Tone, label: '위험' }, meta: '3일 미접속', pct: 47, pctColor: 'var(--danger)' },
    { initial: '지', avBg: 'linear-gradient(135deg,#F97316,#9A3412)', name: '이지원', tag: { tone: 'danger' as Tone, label: '위험' }, meta: '근의 공식 32%', pct: 32, pctColor: 'var(--danger)', active: true },
    { initial: '민', avBg: 'linear-gradient(135deg,#F59E0B,#B45309)', name: '김민서', tag: { tone: 'warn' as Tone, label: '주의' }, meta: '학습량 -40%', pct: 71, pctColor: 'var(--warn)' },
    { initial: '도', avBg: 'linear-gradient(135deg,#FBBF24,#B45309)', name: '김도연', tag: { tone: 'gold' as Tone, label: '⭐' }, meta: '방금 학습', pct: 96, pctColor: 'var(--success)' },
    { initial: '지', avBg: 'linear-gradient(135deg,#94A3B8,#475569)', name: '박지호', meta: '2시간 전', pct: 88, pctColor: 'var(--success)' },
    { initial: '윤', avBg: 'linear-gradient(135deg,#06B6D4,#0E7490)', name: '이윤재', tag: { tone: 'indigo' as Tone, label: '상승' }, meta: '1시간 전', pct: 94, pctColor: 'var(--success)' },
    { initial: '서', avBg: 'linear-gradient(135deg,#A78BFA,#7C3AED)', name: '이서연', meta: '방금 학습', pct: 82, pctColor: 'var(--success)' },
    { initial: '하', avBg: 'linear-gradient(135deg,#3B5BDB,#1E3A8A)', name: '최하준', meta: '1일 전', pct: 85, pctColor: 'var(--success)' },
    { initial: '예', avBg: 'linear-gradient(135deg,#EC4899,#831843)', name: '황예린', tag: { tone: 'indigo' as Tone, label: '상승' }, meta: '3시간 전', pct: 92, pctColor: 'var(--success)' },
    { initial: '건', avBg: 'linear-gradient(135deg,#16A34A,#14532D)', name: '강건우', meta: '5시간 전', pct: 77, pctColor: 'var(--warn)' },
    { initial: '민', avBg: 'linear-gradient(135deg,#A78BFA,#7C3AED)', name: '정민지', meta: '2시간 전', pct: 88, pctColor: 'var(--success)' },
  ],
  detail: {
    initial: '지',
    avBg: 'linear-gradient(135deg,#F97316,#9A3412)',
    name: '이지원',
    chips: [{ tone: 'danger' as Tone, label: '위험 학생' }, { tone: 'gray' as Tone, label: 'Lv.10' }],
    info: '중2A · 8학년 · 가입일 2024.03.15 · 학부모: 010-XXXX-1234',
    weakChips: [
      { tone: 'warn' as Tone, label: '근의 공식 32%' },
      { tone: 'warn' as Tone, label: '함수 그래프 41%' },
      { tone: 'danger' as Tone, label: '정답률 ▼25%p (지난주 대비)' },
    ],
    lastLearned: { time: '오늘 14:23' },
    weeklyMinutes: 28,
    kpi: [
      { label: '정답률 (7일)', value: 32, unit: '%', color: 'var(--danger)', delta: '▼ 25%p', deltaClass: 'delta-down' },
      { label: '완료 문제', value: 28, sub: '최근 7일' },
      { label: '스트릭', value: 5, unit: '일', sub: '🔥' },
      { label: '현재 단원', text: '이차방정식', sub: '진척 47%', subColor: 'var(--warn)' },
    ],
    skills: [
      { name: '근의 공식', pct: 32, color: 'var(--danger)' },
      { name: '함수 그래프', pct: 41, color: 'var(--warn)' },
      { name: '이차방정식 활용', pct: 48, color: 'var(--warn)' },
      { name: '완전제곱식', pct: 62, color: '#84CC16' },
      { name: '인수분해', pct: 78, color: 'var(--success)' },
      { name: '제곱근의 계산', pct: 85, color: 'var(--success)' },
    ],
    timeline: [
      { time: '14:23', act: true, text: '근의 공식 문제 5/8 완료', sub: '정답률 38% · 풀이 시간 14분' },
      { time: '14:00', text: '개념 학습 — 근의 공식 시청', sub: '완료 · 7분 영상' },
      { time: '어제 19:40', act: true, text: '단원평가 응시 — 58점', sub: '중2A 이차방정식 단원평가' },
      { time: '어제 17:12', text: '숙제 제출 — 함수의 기초', sub: '12/15 정답' },
      { time: '5/2', text: '스트릭 시작', sub: '5일째 매일 학습 중' },
      { time: '4/30', text: '레벨업 — Lv.9 → Lv.10', sub: '+50 P 보상' },
    ],
    ai: {
      summary: <>이지원 학생은 <b>인수분해(78%) → 완전제곱식(62%) → 근의 공식(32%)</b> 흐름에서 갑자기 정답률이 떨어졌습니다. 완전제곱식 부분을 한 번 더 짚고 가는 것을 권장. 적절한 보충 숙제 3개를 자동 생성했습니다.</>,
    },
  },
};

export default function TeacherStudentsV2Page() {
  const data = MOCK;
  const d = data.detail;

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
        title={<a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none', fontSize: 13 }}>← 학생 목록</a>}
        subtitle={`${data.classInfo.className} · ${data.classInfo.size}명`}
        right={
          <>
            <Button>📨 메시지</Button>
            <Button>📑 리포트</Button>
            <Button variant="primary">＋ 보충 숙제</Button>
          </>
        }
      />

      <div className="detail-grid">
        {/* 좌측: 학생 목록 */}
        <div className="detail-list">
          <div className="row" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="학생 검색..."
                style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-2)' }}
              />
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', fontSize: 12 }}>🔍</span>
            </span>
          </div>
          <div className="row" style={{ padding: '8px 14px', background: 'var(--bg-2)' }}>
            {data.filters.map(f => (
              <span key={f.label} className={`fchip${f.active ? ' active' : ''}`} style={{ fontSize: 11, padding: '3px 8px' }}>
                {f.label}
              </span>
            ))}
          </div>

          {data.students.map((s, i) => (
            <div key={i} className={`ditem${s.active ? ' active' : ''}`}>
              <div className="av" style={{ width: 36, height: 36, background: s.avBg }}>{s.initial}</div>
              <div>
                <div className="nm">
                  {s.name}{' '}
                  {s.tag && <Chip tone={s.tag.tone as 'danger' | 'warn' | 'gold' | 'gray' | 'indigo'}>{s.tag.label}</Chip>}
                </div>
                <div className="meta">{s.meta}</div>
              </div>
              <div className="pct" style={{ color: s.pctColor }}>{s.pct}</div>
            </div>
          ))}
        </div>

        {/* 우측: 학생 상세 */}
        <div className="detail-content">
          {/* 헤더 */}
          <div className="row" style={{ gap: 16, paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
            <div className="av" style={{ width: 64, height: 64, background: d.avBg, fontSize: 22 }}>{d.initial}</div>
            <div style={{ flex: 1 }}>
              <div className="row gap-4">
                <h2 style={{ fontSize: 22, margin: 0 }}>{d.name}</h2>
                {d.chips.map((c, i) => <Chip key={i} tone={c.tone as 'danger' | 'warn' | 'gold' | 'gray' | 'indigo'}>{c.label}</Chip>)}
              </div>
              <div className="text-3" style={{ marginTop: 4 }}>{d.info}</div>
              <div className="row gap-4" style={{ marginTop: 8 }}>
                {d.weakChips.map((c, i) => <Chip key={i} tone={c.tone as 'warn' | 'danger'}>{c.label}</Chip>)}
              </div>
            </div>
            <div className="col" style={{ textAlign: 'right' }}>
              <div className="text-3">최근 학습</div>
              <div className="bold">{d.lastLearned.time}</div>
              <div className="text-3" style={{ marginTop: 8 }}>7일 학습량</div>
              <div className="bold">{d.weeklyMinutes}분 / 일</div>
            </div>
          </div>

          {/* KPI */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', marginTop: 16, gap: 12 }}>
            {d.kpi.map((k, i) => (
              <div key={i} className="card" style={{ padding: 12 }}>
                <div className="text-3">{k.label}</div>
                {k.text ? (
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{k.text}</div>
                ) : (
                  <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>
                    {k.value}{k.unit && <span style={{ fontSize: 12 }}>{k.unit}</span>}
                  </div>
                )}
                <div style={{ fontSize: 11, color: k.subColor || 'var(--ink-3)' }} className={k.deltaClass}>
                  {k.delta || k.sub}
                </div>
              </div>
            ))}
          </div>

          <div className="grid mt-24" style={{ gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {/* 좌: 개념 숙지도 */}
            <div className="card">
              <div className="card-head"><h3>📚 개념별 숙지도</h3><span className="more">전체</span></div>
              <div>
                {d.skills.map(sk => (
                  <div key={sk.name} className="skill-row">
                    <div className="lb">{sk.name}</div>
                    <div className="perf-bar"><i style={{ width: `${sk.pct}%`, background: sk.color }} /></div>
                    <div className="vl" style={{ color: sk.color }}>{sk.pct}%</div>
                  </div>
                ))}
              </div>
              <Button variant="primary" style={{ width: '100%', marginTop: 12 }}>🎯 약점 단원 보충 숙제 (3개)</Button>
            </div>

            {/* 우: 활동 타임라인 */}
            <div className="card">
              <div className="card-head"><h3>⏱ 활동 타임라인</h3><span className="more">전체</span></div>
              <div>
                {d.timeline.map((t, i) => (
                  <div key={i} className="tl-row">
                    <div className="tm">{t.time}</div>
                    <div className={`ev${t.act ? ' act' : ''}`}>
                      {t.text}
                      <span className="sub">{t.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI 추천 */}
          <div className="card" style={{ marginTop: 18, background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)', borderColor: '#C7D2FE' }}>
            <div className="card-head" style={{ marginBottom: 8 }}>
              <h3>🤖 AI 추천</h3>
              <Chip tone="indigo">자동 분석</Chip>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>
              {d.ai.summary}
            </div>
            <div className="row gap-4" style={{ marginTop: 12 }}>
              <Button variant="primary">추천 숙제 검토</Button>
              <Button>학부모 메시지 초안</Button>
              <Button variant="ghost">무시</Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
