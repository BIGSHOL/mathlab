/**
 * Pattern E (칸반/타임라인) 데모 — W6-3
 * 시안: data/refact2/pages/pattern-e-kanban-timeline-hifi.html
 *
 * V1 — 칸반 보드 (4컬럼: 할 일·진행·검토·완료)
 * V2 — 간트 타임라인 (14일 × 다중 반)
 * V3 — 액티비티 타임라인 (수직 시간순)
 */
'use client';

import { useState } from 'react';

type Card = {
  id: string;
  tags: Array<{ kind: 'urgent' | 'exam' | 'hw' | 'review' | 'meet'; label: string }>;
  title: string;
  meta?: string;
  due?: { label: string; tone?: 'late' | 'soon' };
  progress?: number;
  ppl?: Array<{ initial: string; tone: 'b1' | 'b2' | 'b3' | 'b4' | 'b5' }>;
  preview?: boolean;
};

const COLS: Record<'todo' | 'doing' | 'review' | 'done', { name: string; cards: Card[] }> = {
  todo: {
    name: '할 일',
    cards: [
      {
        id: 't1',
        tags: [{ kind: 'urgent', label: '긴급' }, { kind: 'exam', label: '시험' }],
        title: '중3-B 4월 모의시험 출제 준비',
        meta: '· 25문항',
        due: { label: '마감 -1일', tone: 'late' },
        ppl: [{ initial: '박', tone: 'b1' }],
      },
      {
        id: 't2',
        tags: [{ kind: 'hw', label: '숙제' }],
        title: '중2-A 일차방정식 단원 평가지 만들기',
        due: { label: '마감 D-1', tone: 'soon' },
        ppl: [{ initial: '박', tone: 'b1' }, { initial: '최', tone: 'b3' }],
      },
      {
        id: 't3',
        tags: [{ kind: 'meet', label: '면담' }],
        title: '정현우 학부모 상담 통화',
        due: { label: '금요일 16:00' },
        ppl: [{ initial: '박', tone: 'b1' }],
      },
      { id: 'tp', tags: [], title: '⊕ 카드 끌어 놓기 / 클릭하여 추가', preview: true },
    ],
  },
  doing: {
    name: '진행 중',
    cards: [
      {
        id: 'd1',
        tags: [{ kind: 'exam', label: '시험' }],
        title: '중3-A 3월 모의시험 객관식 채점',
        meta: '28명 중 18명',
        progress: 64,
        ppl: [{ initial: '박', tone: 'b1' }, { initial: '김', tone: 'b2' }],
      },
      {
        id: 'd2',
        tags: [{ kind: 'hw', label: '숙제' }],
        title: '이지원 오답노트 검토 및 코멘트',
        meta: '12문항 중 8',
        progress: 67,
        ppl: [{ initial: '박', tone: 'b1' }],
      },
      {
        id: 'd3',
        tags: [{ kind: 'review', label: '분석' }],
        title: '중1-A 단원별 마스터리 리포트 작성',
        meta: '섹션 3/5 완료',
        progress: 60,
        ppl: [{ initial: '박', tone: 'b1' }],
      },
    ],
  },
  review: {
    name: '검토',
    cards: [
      {
        id: 'r1',
        tags: [{ kind: 'exam', label: '시험' }],
        title: '중3-B 모의시험 결과 분석 보고서',
        meta: '학원장 검토 대기',
        ppl: [{ initial: '박', tone: 'b1' }, { initial: '원', tone: 'b4' }],
      },
      {
        id: 'r2',
        tags: [{ kind: 'hw', label: '숙제' }],
        title: '5월 첫째 주 숙제 패키지',
        meta: '다른 강사 1명 검토 중',
        ppl: [{ initial: '최', tone: 'b3' }],
      },
    ],
  },
  done: {
    name: '완료',
    cards: [
      { id: 'D1', tags: [{ kind: 'hw', label: '숙제' }], title: '4월 마지막 주 숙제 채점', meta: '3일 전' },
      { id: 'D2', tags: [{ kind: 'exam', label: '시험' }], title: '중2-A 단원평가 출제', meta: '5일 전' },
      { id: 'D3', tags: [{ kind: 'review', label: '분석' }], title: '3월 학급별 성취도 리포트', meta: '1주 전' },
    ],
  },
};

const DAYS = [
  { d: '5/6', dow: '화' }, { d: '7', dow: '수' }, { d: '8', dow: '목' }, { d: '9', dow: '금' },
  { d: '10', dow: '토', we: true }, { d: '11', dow: '일', we: true },
  { d: '12', dow: '월', today: true }, { d: '13', dow: '화' }, { d: '14', dow: '수' },
  { d: '15', dow: '목' }, { d: '16', dow: '금' },
  { d: '17', dow: '토', we: true }, { d: '18', dow: '일', we: true },
  { d: '19', dow: '월' },
];

const GANTT_ROWS = [
  {
    label: '중1-A', meta: '28명', swatch: 'var(--primary)',
    bars: [
      { kind: 'hw', ico: '📝', title: '일차방정식 숙제', from: 0, len: 3 },
      { kind: 'ex', ico: '📋', title: '단원평가', from: 3, len: 2 },
      { kind: 'rv', ico: '🔄', title: '약점 복습', from: 7, len: 3 },
      { kind: 'hw', ico: '📝', title: '다음 단원 숙제', from: 10, len: 4 },
    ],
  },
  {
    label: '중2-A', meta: '25명', swatch: '#10B981',
    bars: [
      { kind: 'ex', ico: '📋', title: '모의시험', from: 1, len: 2 },
      { kind: 'hw', ico: '📝', title: '이차방정식 패키지', from: 4, len: 5 },
      { kind: 'ex', ico: '📋', title: '중간고사 대비', from: 10, len: 3 },
    ],
  },
  {
    label: '중3-A', meta: '22명', swatch: '#8B5CF6',
    bars: [
      { kind: 'hw', ico: '📝', title: '인수분해 숙제', from: 0, len: 3 },
      { kind: 'ex', ico: '📋', title: '모의시험 1차', from: 5, len: 2 },
      { kind: 'mt', ico: '👥', title: '학부모 상담', from: 8, len: 1 },
      { kind: 'rv', ico: '🔄', title: '약점 집중 복습', from: 9, len: 5 },
    ],
  },
];

const TIMELINE = [
  { day: '오늘', date: '2026.05.12 · 월요일', today: true, items: [
    { tone: 'success', dot: '✓', who: '숙제 완료', time: '방금 전', desc: '<b>일차방정식 단원</b> 문제 20개 풀이 — 정답 18 / 오답 2', embed: { ic: '📝', t: '일차방정식 단원평가지', s: '정답률 90% · 22분 32초', btn: '보기' } },
    { tone: 'primary', dot: '▶', who: '개념 학습', time: '2시간 전', desc: '<b>일차방정식의 활용</b> 강의 시청 완료 (16분 12초)' },
    { tone: 'warn', dot: '!', who: '선생님 코멘트', time: '3시간 전', desc: '<b>박선생님</b>이 오답노트에 코멘트를 남겼습니다.' },
  ]},
  { day: '어제', date: '2026.05.11 · 일요일', items: [
    { tone: 'success', dot: '★', who: '배지 획득', time: '21:14', desc: '새 배지 <b>"7일 연속 학습"</b> 획득!' },
    { tone: 'primary', dot: '⚡', who: '시험 응시', time: '14:00 · 60분', desc: '<b>4월 모의시험</b> 응시 완료 — 87점 (학급 5/28등)' },
  ]},
  { day: '2일 전', date: '2026.05.10 · 토요일', items: [
    { tone: 'danger', dot: '×', who: '숙제 미제출', time: '23:59 마감', desc: '<b>주말 숙제</b> 마감 시간 초과 — 자동 0점 처리' },
  ]},
];

export default function PatternEDemo() {
  const [tab, setTab] = useState<'kanban' | 'gantt' | 'activity'>('kanban');

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '32px 24px 96px', background: 'var(--bg)' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--ink)' }}>
        Pattern E · 칸반 / 타임라인{' '}
        <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 18 }}>— 3 변형</span>
      </h1>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.7, maxWidth: 860, marginBottom: 24 }}>
        시간/상태로 흐르는 항목 패턴. <b>칸반(상태별 컬럼)</b> / <b>간트(시간축 막대)</b> / <b>액티비티(수직 흐름)</b>.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['kanban', 'V1 칸반'], ['gantt', 'V2 간트'], ['activity', 'V3 액티비티']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k as typeof tab)}
            className={`kt-btn${tab === k ? ' primary' : ''}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ─── V1 칸반 ─── */}
      {tab === 'kanban' && (
        <section>
          <div className="kt-frame">
            <div className="kt-topbar">
              <span className="title">선생님 작업 보드</span>
              <span className="meta">처리할 일 18건 · 완료 24건 (이번 주)</span>
              <div className="sp" />
              <span className="kt-chip on">전체</span>
              <span className="kt-chip">내 담당</span>
              <span className="kt-chip">긴급</span>
              <button className="kt-btn primary">+ 새 작업</button>
            </div>
            <div className="kt-kanban-wrap">
              <div className="kt-kanban">
                {(['todo', 'doing', 'review', 'done'] as const).map((key) => (
                  <div key={key} className={`kt-col ${key}`}>
                    <div className="kt-col-head">
                      <span className="dot" />
                      <span className="name">{COLS[key].name}</span>
                      <span className="count">{COLS[key].cards.filter(c => !c.preview).length}</span>
                      <span className="add">＋</span>
                    </div>
                    <div className="kt-col-list">
                      {COLS[key].cards.map((card) =>
                        card.preview ? (
                          <div key={card.id} className="kt-kcard preview">{card.title}</div>
                        ) : (
                          <div key={card.id} className="kt-kcard">
                            <div className="tags">
                              {card.tags.map((t, i) => (
                                <span key={i} className={`tag ${t.kind}`}>{t.label}</span>
                              ))}
                            </div>
                            <div className="title">{card.title}</div>
                            <div className="kmeta">
                              {card.due && (
                                <span className={`due ${card.due.tone ?? ''}`}>{card.due.label}</span>
                              )}
                              {card.meta && <span>{card.meta}</span>}
                            </div>
                            {card.progress !== undefined && (
                              <div className="progress-mini">
                                <span style={{ width: `${card.progress}%` }} />
                              </div>
                            )}
                            {card.ppl && card.ppl.length > 0 && (
                              <div className="ppl">
                                {card.ppl.map((p, i) => (
                                  <div key={i} className={`av ${p.tone}`}>{p.initial}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── V2 간트 ─── */}
      {tab === 'gantt' && (
        <section>
          <div className="kt-frame">
            <div className="kt-topbar">
              <span className="title">2026년 5월 학사 일정</span>
              <span className="meta">시험 6 · 숙제 14 · 면담 5</span>
              <div className="sp" />
              <span className="kt-chip on">전체</span>
              <span className="kt-chip">시험</span>
              <span className="kt-chip">숙제</span>
              <button className="kt-btn primary">+ 일정 추가</button>
            </div>
            <div className="kt-gantt-wrap">
              <div className="kt-gantt-bar-head">
                <span className="lb">표시 범위</span>
                <div className="kt-range-pick">
                  <span>주</span>
                  <span className="on">2주</span>
                  <span>월</span>
                  <span>학기</span>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--ink-3)', fontSize: 12 }}>
                  2026.05.06 — 05.19
                </span>
              </div>
              <div className="kt-gantt">
                <div className="kt-gantt-head-rows">반 / 일정</div>
                <div className="kt-gantt-head-days">
                  {DAYS.map((d, i) => (
                    <div key={i} className={d.we ? 'weekend' : d.today ? 'today' : ''}>
                      <b>{d.d}</b><span className="dow">{d.dow}</span>
                    </div>
                  ))}
                </div>
                {GANTT_ROWS.map((row, i) => (
                  <div key={i} className="kt-gantt-rows" style={{ display: 'contents' }}>
                    <div className="kt-gantt-row-label">
                      <span className="swatch" style={{ background: row.swatch }} />
                      {row.label}
                      <span className="gmeta">{row.meta}</span>
                    </div>
                    <div className="kt-gantt-row-track">
                      {row.bars.map((b, j) => (
                        <div
                          key={j}
                          className={`kt-gantt-bar ${b.kind}`}
                          style={{
                            left: `calc(100%/14*${b.from})`,
                            width: `calc(100%/14*${b.len} - 4px)`,
                          }}
                        >
                          <span className="ico">{b.ico}</span> {b.title}
                        </div>
                      ))}
                      {i === GANTT_ROWS.length - 1 && (
                        <div className="kt-gantt-today-line" style={{ left: 'calc(100%/14*6)' }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── V3 액티비티 ─── */}
      {tab === 'activity' && (
        <section>
          <div className="kt-frame">
            <div className="kt-topbar">
              <span className="title">이지원 · 학습 활동 기록</span>
              <span className="meta">최근 14일 · 활동 47건</span>
              <div className="sp" />
              <button className="kt-btn">📤 학부모에게 공유</button>
            </div>
            <div className="kt-activity-wrap">
              <div className="kt-act-main">
                <div className="kt-timeline">
                  {TIMELINE.map((day, di) => (
                    <div key={di}>
                      <div className="kt-day-mark">
                        <span className={`lb ${day.today ? 'today' : ''}`}>{day.day}</span>
                        <span className="date">{day.date}</span>
                      </div>
                      {day.items.map((it, ii) => (
                        <div key={ii} className={`kt-tl-item ${it.tone}`}>
                          <div className="dot">{it.dot}</div>
                          <div className="kt-tl-card">
                            <div className="head">
                              <span className="who">{it.who}</span>
                              <span className="time">{it.time}</span>
                            </div>
                            <div className="desc" dangerouslySetInnerHTML={{ __html: it.desc }} />
                            {'embed' in it && it.embed && (
                              <div className="embed">
                                <div className="ic">{it.embed.ic}</div>
                                <div className="info">
                                  <div className="t">{it.embed.t}</div>
                                  <div className="s">{it.embed.s}</div>
                                </div>
                                <button className="btn-sm">{it.embed.btn}</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <aside className="kt-act-side">
                <h4>활동 종류</h4>
                <div className="kt-act-filter-list">
                  <div className="it on">📊 전체 <span className="cnt">47</span></div>
                  <div className="it">✓ 완료 <span className="cnt">22</span></div>
                  <div className="it">⚡ 시험 응시 <span className="cnt">5</span></div>
                  <div className="it">📝 숙제 <span className="cnt">12</span></div>
                  <div className="it">▶ 개념 학습 <span className="cnt">8</span></div>
                </div>
                <h4>요약</h4>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>학습 시간</span>
                    <b style={{ color: 'var(--ink)' }}>14시간 32분</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>풀이 문제</span>
                    <b style={{ color: 'var(--ink)' }}>186 문항</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>평균 정답률</span>
                    <b style={{ color: 'var(--success)' }}>87%</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>연속 학습</span>
                    <b style={{ color: 'var(--warn)' }}>7일 🔥</b>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
