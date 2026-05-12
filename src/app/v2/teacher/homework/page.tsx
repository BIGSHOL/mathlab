/**
 * 선생님 숙제 출제 V2 — data/refact/pages/teacher-homework-hifi.html V2 변형
 * 빌더 — 4단계 워크플로우 (단원 → 문제 선택 → 학생 배정 → 일정/설정).
 *
 * 풀스크린 모드 (사이드바 없음, no-side AppShell). 현재 단계 2/4 = 문제 선택.
 */
import { AppShell, Topbar } from '@/components/layout-v2';
import { Button, Chip } from '@/components/ui-v2';
import '@/styles/v2-pages/teacher-homework.css';

type QLvl = 'l1' | 'l2' | 'l3' | 'l4';

const MOCK = {
  steps: [
    { num: '✓', label: '단원·범위 선택', sub: '중2 · 이차방정식 · 근의 공식', state: 'done' as const },
    { num: '2', label: '문제 선택', sub: '8문항 / 10문항 권장', state: 'active' as const },
    { num: '3', label: '학생 배정', sub: '반 · 그룹 · 개별', state: 'pending' as const },
    { num: '4', label: '일정 · 설정', sub: '시작/마감 · 알림 · 채점 옵션', state: 'pending' as const },
  ],
  summary: [
    { icon: '📚', text: <><b style={{ color: 'var(--ink)' }}>이차방정식 · 근의 공식</b></> },
    { icon: '📋', text: '8문항 (난이도 1-3)' },
    { icon: '👥', text: '미정' },
    { icon: '📅', text: '미정' },
  ],
  questions: [
    { title: '근의 공식으로 풀기 — 기본형', sub: 'x² + 3x - 4 = 0 · 객관식 5지선다', lvl: 'l1' as QLvl, lvlLabel: '난이도1', acc: 82, selected: true },
    { title: '근의 공식 — 판별식 D=0', sub: '중근 판별 · 객관식', lvl: 'l2' as QLvl, lvlLabel: '난이도2', acc: 64, selected: true },
    { title: '근의 공식 — 무리수 근 처리', sub: '단답형 (정확한 값 입력)', lvl: 'l2' as QLvl, lvlLabel: '난이도2', acc: 58, selected: true },
    { title: '실생활 응용 — 정원의 둘레', sub: '서술형 · 공통 함정 포함', lvl: 'l3' as QLvl, lvlLabel: '난이도3', acc: 47, selected: false },
    { title: '근과 계수의 관계 (a + b)', sub: '객관식', lvl: 'l2' as QLvl, lvlLabel: '난이도2', acc: 71, selected: true },
    { title: '두 근의 합과 곱으로 방정식 만들기', sub: '단답형', lvl: 'l3' as QLvl, lvlLabel: '난이도3', acc: 52, selected: false },
    { title: '근의 공식 — 음수 판별식', sub: '실근 없음 판별 · 객관식', lvl: 'l2' as QLvl, lvlLabel: '난이도2', acc: 60, selected: true },
    { title: '[중3 응용] 두 근의 차로 a 구하기', sub: '서술형 · 상위 단원 선택', lvl: 'l4' as QLvl, lvlLabel: '난이도4', acc: 32, selected: false },
  ],
  preview: [
    { idx: 1, lvl: 'l1' as QLvl, lvlLabel: '난1', title: '근의 공식 기본형' },
    { idx: 2, lvl: 'l2' as QLvl, lvlLabel: '난2', title: '판별식 D=0' },
    { idx: 3, lvl: 'l2' as QLvl, lvlLabel: '난2', title: '무리수 근' },
    { idx: 4, lvl: 'l2' as QLvl, lvlLabel: '난2', title: '근과 계수 관계' },
    { idx: 5, lvl: 'l2' as QLvl, lvlLabel: '난2', title: '음수 판별식' },
  ],
  diffDist: { l1: 1, l2: 4, l3: 0 },
  estimatedMinutes: 14,
};

export default function TeacherHomeworkV2Page() {
  const data = MOCK;
  const selectedCount = data.questions.filter(q => q.selected).length;

  return (
    <AppShell sidebar={null} noSide>
      <Topbar
        title={<a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none', fontSize: 13 }}>← 숙제 목록</a>}
        subtitle={<span style={{ fontWeight: 700, fontSize: 14 }}>새 숙제 — 단계 2/4</span>}
        right={
          <>
            <Button>임시 저장</Button>
            <Button>미리보기</Button>
            <Button variant="primary">다음 →</Button>
          </>
        }
      />

      <div className="builder">
        {/* LEFT: STEPS */}
        <div className="b-step">
          <h4>출제 단계</h4>
          {data.steps.map((s, i) => (
            <div key={i} className={`step ${s.state}`}>
              <div className="n">{s.num}</div>
              <div>
                <div className="lb">{s.label}</div>
                <div className="sub">{s.sub}</div>
              </div>
            </div>
          ))}

          <div style={{ height: 1, background: 'var(--line)', margin: '18px 0' }} />
          <h4>요약</h4>
          <div className="text-3" style={{ fontSize: 12, lineHeight: 1.7 }}>
            {data.summary.map((s, i) => (
              <div key={i}>{s.icon} {s.text}</div>
            ))}
          </div>
        </div>

        {/* CENTER: QUESTION PICKER */}
        <div className="b-canvas">
          <div className="row between" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>문제 선택 — 근의 공식</h3>
            <div className="row gap-4">
              <Chip tone="indigo">선택 {selectedCount}문항</Chip>
              <Button variant="ghost" style={{ fontSize: 12 }}>전체 해제</Button>
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <Button variant="primary" style={{ fontSize: 12, padding: '5px 12px' }}>AI 추천</Button>
            <Button style={{ fontSize: 12, padding: '5px 12px' }}>기출</Button>
            <Button style={{ fontSize: 12, padding: '5px 12px' }}>난이도 1</Button>
            <Button style={{ fontSize: 12, padding: '5px 12px' }}>난이도 2</Button>
            <Button style={{ fontSize: 12, padding: '5px 12px' }}>난이도 3</Button>
            <span style={{ flex: 1 }} />
            <span className="text-3" style={{ fontSize: 12 }}>총 142문항</span>
          </div>

          {data.questions.map((q, i) => (
            <div key={i} className={`qpicker-row${q.selected ? ' selected' : ''}`}>
              {q.selected ? (
                <span style={{ fontSize: 14, color: 'var(--primary)' }}>✓</span>
              ) : (
                <input type="checkbox" disabled />
              )}
              <div>
                <div className="bold" style={{ fontSize: 13 }}>{q.title}</div>
                <div className="text-3" style={{ fontSize: 11 }}>{q.sub}</div>
              </div>
              <span className={`lvl ${q.lvl}`}>{q.lvlLabel}</span>
              <span className="text-3" style={{ fontSize: 11, textAlign: 'right' }}>정답률 {q.acc}%</span>
            </div>
          ))}
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="b-side">
          <h4 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            선택한 문제 ({data.preview.length}/8)
          </h4>
          <div className="col" style={{ gap: 6 }}>
            {data.preview.map(p => (
              <div key={p.idx} className="qbank-card" style={{ padding: 8 }}>
                <div className="row gap-4">
                  <span className="text-3" style={{ fontSize: 10 }}>{p.idx}</span>
                  <span className={`lvl ${p.lvl}`} style={{ fontSize: 9, padding: '1px 6px' }}>{p.lvlLabel}</span>
                  <span className="bold" style={{ fontSize: 12, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.title}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px dashed var(--line)', margin: '14px 0' }} />
          <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            난이도 분포
          </h4>
          <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', background: 'var(--line-2)' }}>
            <div style={{ flex: data.diffDist.l1, background: '#22C55E' }} />
            <div style={{ flex: data.diffDist.l2, background: '#06B6D4' }} />
            <div style={{ flex: data.diffDist.l3, background: '#F59E0B' }} />
          </div>
          <div className="row between mt-8">
            <span className="text-3" style={{ fontSize: 11 }}>난1: {data.diffDist.l1}</span>
            <span className="text-3" style={{ fontSize: 11 }}>난2: {data.diffDist.l2}</span>
            <span className="text-3" style={{ fontSize: 11 }}>난3: {data.diffDist.l3}</span>
          </div>

          <div style={{ borderTop: '1px dashed var(--line)', margin: '14px 0' }} />
          <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            예상 풀이 시간
          </h4>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {data.estimatedMinutes}<span style={{ fontSize: 12, color: 'var(--ink-3)' }}> 분</span>
          </div>
          <div className="text-3" style={{ fontSize: 11 }}>평균 학생 기준</div>
          <Button style={{ width: '100%', marginTop: 14 }}>📄 학습지 PDF로</Button>
        </div>
      </div>
    </AppShell>
  );
}
