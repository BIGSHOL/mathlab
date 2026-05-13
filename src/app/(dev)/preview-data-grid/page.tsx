/**
 * Pattern D (데이터 그리드) 데모 — W7-base
 * 시안: data/refact2/pages/pattern-d-data-grid-hifi.html
 *
 * V1 — 스프레드시트 (점수 일괄 입력)
 * V2 — 히트맵 (학생 × 단원 마스터리)
 * V3 — 일괄 편집 (체크박스 + 액션바)
 */
'use client';

import { useState } from 'react';

// V1 점수 데이터
const SCORE_DATA: Array<{ name: string; meta: string; scores: Array<number | null> }> = [
  { name: '이지원', meta: '7번', scores: [5, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 2, 5] },
  { name: '박서윤', meta: '8번', scores: [5, 5, 5, 0, 5, 5, 5, 5, 3, 5, 5, 5, 5] },
  { name: '김태민', meta: '3번', scores: [5, 5, 0, 2, 5, 0, 5, 3, 5, 0, 5, 5, 2] },
  { name: '최유진', meta: '15번', scores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 5] },
  { name: '정현우', meta: '11번', scores: [null, null, null, null, null, null, null, null, null, null, null, null, null] },
  { name: '강민서', meta: '2번', scores: [5, 5, 5, 5, 3, 5, 5, 2, 5, 5, 5, 5, 5] },
  { name: '윤소영', meta: '19번', scores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 5, 5, 5] },
];

function getGrade(total: number | null): 'A' | 'B' | 'C' | 'D' | '—' {
  if (total === null) return '—';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 55) return 'C';
  return 'D';
}

// V2 히트맵 데이터
const HEAT_DATA = [
  { name: '최유진', grade: 'B', values: [100, 96, 92, 85, 88, 78] },
  { name: '윤소영', grade: 'B', values: [100, 88, 90, 76, 85, 72] },
  { name: '이지원', grade: 'A', values: [100, 72, 67, 52, 78, 62] },
  { name: '박서윤', grade: 'A', values: [88, 75, 68, 58, 72, 65] },
  { name: '강민서', grade: 'A', values: [85, 72, 63, 55, 66, 58] },
  { name: '김태민', grade: 'A', values: [62, 52, 42, 35, 48, 38] },
  { name: '정현우', grade: 'B', values: [52, 38, 28, 25, 32, 22] },
];
const HEAT_COLS = ['소인수\n분해', '정수와\n유리수', '사칙\n연산', '절댓값\n·부등호', '문자의\n사용', '일차식\n계산'];

function getHeatTone(v: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (v >= 90) return 6;
  if (v >= 80) return 5;
  if (v >= 70) return 4;
  if (v >= 60) return 3;
  if (v >= 50) return 2;
  return 1;
}

// V3 일괄 편집 데이터
const STUDENTS = [
  { id: '1', name: '이지원', grade: '중1-A', status: 'active' as const, avg: 86, attend: 98, phone: '010-1234-5678', recent: '2시간 전' },
  { id: '2', name: '박서윤', grade: '중1-A', status: 'active' as const, avg: 82, attend: 100, phone: '010-2345-6789', recent: '5시간 전' },
  { id: '3', name: '김태민', grade: '중1-A', status: 'risk' as const, avg: 64, attend: 82, phone: '010-3456-7890', recent: '1일 전' },
  { id: '4', name: '최유진', grade: '중1-B', status: 'active' as const, avg: 91, attend: 95, phone: '010-4567-8901', recent: '방금 전' },
  { id: '5', name: '정현우', grade: '중1-B', status: 'risk' as const, avg: 48, attend: 72, phone: '010-5678-9012', recent: '4일 전' },
  { id: '6', name: '강민서', grade: '중2-A', status: 'active' as const, avg: 79, attend: 96, phone: '010-6789-0123', recent: '3시간 전' },
  { id: '7', name: '윤소영', grade: '중2-B', status: 'active' as const, avg: 88, attend: 100, phone: '010-7890-1234', recent: '1시간 전' },
  { id: '8', name: '한지호', grade: '중2-B', status: 'paused' as const, avg: null, attend: null, phone: '010-8901-2345', recent: '14일 전' },
];

const STATUS_LABEL = { active: '활성', paused: '휴원', risk: '위험' };

export default function PatternDDemo() {
  const [tab, setTab] = useState<'sheet' | 'heat' | 'bulk'>('sheet');
  const [scores, setScores] = useState(SCORE_DATA);
  const [selectedHeat, setSelectedHeat] = useState<{ r: number; c: number } | null>({ r: 2, c: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['1', '2', '3', '5', '8']));

  const updateScore = (r: number, c: number, v: string) => {
    const num = v === '' ? null : Number(v);
    setScores((prev) =>
      prev.map((row, i) =>
        i === r ? { ...row, scores: row.scores.map((s, j) => (j === c ? num : s)) } : row
      )
    );
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(STUDENTS.map((s) => s.id)));
    else setSelectedIds(new Set());
  };
  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '32px 24px 96px', background: 'var(--bg)' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--ink)' }}>
        Pattern D · 데이터 그리드{' '}
        <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 18 }}>— 3 변형</span>
      </h1>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.7, maxWidth: 860, marginBottom: 24 }}>
        행렬 형태로 다수 데이터를 동시 보고/편집. <b>스프레드시트(빠른 입력)</b> / <b>히트맵(패턴 시각화)</b> / <b>일괄 편집(체크박스)</b>.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(
          [
            ['sheet', 'V1 스프레드시트'],
            ['heat', 'V2 히트맵'],
            ['bulk', 'V3 일괄 편집'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`dg-btn${tab === k ? ' primary' : ''}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ─── V1 ─── */}
      {tab === 'sheet' && (
        <div className="dg-frame">
          <div className="dg-topbar">
            <span className="title">중1-A · 4월 모의시험 점수 입력</span>
            <span className="meta">{scores.length}명 · 13문항 · 5점 만점</span>
            <div className="sp" />
            <button className="dg-btn">📥 CSV 가져오기</button>
            <button className="dg-btn">📤 내보내기</button>
            <button className="dg-btn primary">
              ✓ 입력 완료 ({scores.filter((r) => r.scores.every((s) => s !== null)).length}/{scores.length})
            </button>
          </div>
          <div className="dg-v1-toolbar">
            <div className="group">
              <span className="lb">행</span>
              <button className="icon-btn" title="행 추가">＋</button>
              <button className="icon-btn" title="복제">⎘</button>
            </div>
            <div className="group">
              <span className="lb">편집</span>
              <button className="icon-btn" title="실행취소">↶</button>
              <button className="icon-btn" title="다시실행">↷</button>
            </div>
            <div className="group">
              <span className="lb">필터</span>
              <span className="dg-chip on">전체</span>
              <span className="dg-chip">미입력</span>
            </div>
            <div className="group" style={{ borderRight: 'none' }}>
              <span className="save-status">
                <span className="pulse" /> 모든 변경사항 저장됨 · 방금 전
              </span>
            </div>
          </div>
          <div className="dg-sheet-wrap">
            <table className="dg-sheet">
              <thead>
                <tr>
                  <th className="col-idx"><div className="h-inner">#</div></th>
                  <th className="col-name"><div className="h-inner">이름</div></th>
                  {Array.from({ length: 13 }, (_, i) => (
                    <th key={i} className="col-q">
                      <div className="h-inner">
                        <span className="q-num">{i + 1}</span>
                        <span className="q-meta">5점</span>
                      </div>
                    </th>
                  ))}
                  <th className="col-total"><div className="h-inner">합계</div></th>
                  <th className="col-grade"><div className="h-inner">등급</div></th>
                </tr>
              </thead>
              <tbody>
                {scores.map((row, r) => {
                  const allEmpty = row.scores.every((s) => s === null);
                  const total = allEmpty ? null : row.scores.reduce<number>((sum, s) => sum + (s ?? 0), 0) * 100 / 65;
                  const totalInt = total !== null ? Math.round(total) : null;
                  const grade = getGrade(totalInt);
                  return (
                    <tr key={r}>
                      <td className="idx">{r + 1}</td>
                      <td className="name">
                        {row.name}
                        <div className="meta">{row.meta}</div>
                      </td>
                      {row.scores.map((s, c) => {
                        const empty = s === null;
                        const wrong = !empty && (s as number) < 5;
                        return (
                          <td key={c} className={`cell${empty ? ' empty' : ''}${wrong ? ' wrong' : ''}`}>
                            <input
                              className="inp"
                              value={s ?? ''}
                              onChange={(e) => updateScore(r, c, e.target.value)}
                            />
                          </td>
                        );
                      })}
                      <td className="total" style={totalInt === null ? { color: 'var(--ink-3)' } : undefined}>
                        {totalInt ?? '—'}
                      </td>
                      <td className="grade" style={grade === '—' ? { color: 'var(--ink-3)' } : undefined}>
                        {grade === '—' ? '—' : <span className={`g-pill ${grade}`}>{grade}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="dg-v1-foot">
            <span>응답 평균 <b>78점</b></span>
            <span>최고 <b>91점 (최유진)</b></span>
            <span style={{ color: 'var(--danger)' }}>
              미입력 <b>{scores.filter((r) => r.scores.some((s) => s === null)).length}명</b>
            </span>
            <div className="sp" />
            <span>
              <kbd>Tab</kbd> 다음 셀 · <kbd>↵</kbd> 다음 행
            </span>
          </div>
        </div>
      )}

      {/* ─── V2 히트맵 ─── */}
      {tab === 'heat' && (
        <div className="dg-frame">
          <div className="dg-topbar">
            <span className="title">중1-A · 단원별 마스터리 매트릭스</span>
            <span className="meta">{HEAT_DATA.length}명 × {HEAT_COLS.length}단원 · 자동 업데이트</span>
            <div className="sp" />
            <button className="dg-btn">📋 약점 학생 추출</button>
            <button className="dg-btn primary">📊 분석 리포트</button>
          </div>
          <div className="dg-heat-wrap">
            <div className="dg-heat-controls">
              <span className="dg-chip on">마스터리 %</span>
              <span className="dg-chip">정답률</span>
              <span className="dg-chip">학습 시간</span>
              <span style={{ marginLeft: 14, fontSize: 12, color: 'var(--ink-3)' }}>정렬:</span>
              <span className="dg-chip">평균 ↓</span>
              <div className="dg-heat-legend">
                <span className="lo">0</span>
                <span className="step" data-tone="1" style={{ background: '#FCA5A5' }} />
                <span className="step" data-tone="2" style={{ background: '#FED7AA' }} />
                <span className="step" data-tone="3" style={{ background: '#FDE68A' }} />
                <span className="step" data-tone="4" style={{ background: '#D9F99D' }} />
                <span className="step" data-tone="5" style={{ background: '#86EFAC' }} />
                <span className="step" data-tone="6" style={{ background: '#22C55E' }} />
                <span className="hi">100</span>
              </div>
            </div>
            <table className="dg-heat-table">
              <thead>
                <tr>
                  <th className="row-h">학생 / 단원</th>
                  {HEAT_COLS.map((col, i) => (
                    <th key={i} className="col-h">
                      <span className="lb">
                        {col.split('\n').map((line, j) => (
                          <span key={j}>
                            {line}
                            {j < col.split('\n').length - 1 && <br />}
                          </span>
                        ))}
                      </span>
                    </th>
                  ))}
                  <th className="col-h" style={{ fontWeight: 800, color: 'var(--ink)' }}>평균</th>
                </tr>
              </thead>
              <tbody>
                {HEAT_DATA.map((row, r) => {
                  const avg = Math.round(row.values.reduce((s, v) => s + v, 0) / row.values.length);
                  const avgColor =
                    avg >= 80 ? 'var(--success)' : avg < 50 ? 'var(--danger)' : avg < 60 ? 'var(--warn)' : undefined;
                  return (
                    <tr key={r}>
                      <td className="name-cell">
                        {row.name}<span className="grade">{row.grade}</span>
                      </td>
                      {row.values.map((v, c) => {
                        const isSelected = selectedHeat?.r === r && selectedHeat?.c === c;
                        return (
                          <td key={c}>
                            <div
                              className={`dg-heat-cell${isSelected ? ' selected' : ''}`}
                              data-tone={getHeatTone(v)}
                              onClick={() => setSelectedHeat({ r, c })}
                            >
                              {v}
                            </div>
                          </td>
                        );
                      })}
                      <td className="avg-cell" style={avgColor ? { color: avgColor } : undefined}>
                        {avg}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="dg-heat-side">
              <div className="dg-heat-detail">
                <h4>
                  {selectedHeat ? `${HEAT_DATA[selectedHeat.r].name} · ${HEAT_COLS[selectedHeat.c].replace('\n', '')}` : '셀 선택 안 됨'}{' '}
                  <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 12 }}>(선택된 셀)</span>
                </h4>
                <div className="meta">2026.04.05 — 2026.05.10 데이터 기준</div>
                {selectedHeat && (
                  <div className="grid">
                    <div className="stat">
                      <div className="lb">마스터리</div>
                      <div className="v">{HEAT_DATA[selectedHeat.r].values[selectedHeat.c]}%</div>
                    </div>
                    <div className="stat">
                      <div className="lb">시도 횟수</div>
                      <div className="v">8회</div>
                    </div>
                    <div className="stat">
                      <div className="lb">정답률</div>
                      <div className="v">{Math.max(0, HEAT_DATA[selectedHeat.r].values[selectedHeat.c] - 6)}%</div>
                    </div>
                    <div className="stat">
                      <div className="lb">평균 풀이</div>
                      <div className="v">42초</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="dg-heat-edit">
                <h4>📝 빠른 액션</h4>
                <div className="row"><span>현재 마스터리</span><b>{selectedHeat ? `${HEAT_DATA[selectedHeat.r].values[selectedHeat.c]}%` : '—'}</b></div>
                <div className="row"><span>마지막 학습</span><b>3일 전</b></div>
                <div className="row"><span>다음 권장</span><b>최대공약수</b></div>
                <div className="actions">
                  <button className="dg-btn">📝 메모</button>
                  <button className="dg-btn primary">▶ 숙제 출제</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── V3 일괄 편집 ─── */}
      {tab === 'bulk' && (
        <div className="dg-frame">
          <div className="dg-topbar">
            <span className="title">학생 관리</span>
            <span className="meta">전체 {STUDENTS.length}명</span>
            <div className="sp" />
            <button className="dg-btn">📋 가져오기</button>
            <button className="dg-btn primary">+ 학생 추가</button>
          </div>
          <div className="dg-bulk-toolbar">
            <input className="search" placeholder="이름·반·학년 검색" />
            <span className="dg-chip on">전체 ({STUDENTS.length})</span>
            <span className="dg-chip">중1</span>
            <span className="dg-chip">중2</span>
            <span className="dg-chip">위험</span>
            <span className="dg-chip">휴원</span>
          </div>
          {selectedIds.size > 0 && (
            <div className="dg-bulk-actionbar">
              <input
                type="checkbox"
                checked={selectedIds.size === STUDENTS.length}
                onChange={(e) => toggleAll(e.target.checked)}
                style={{ accentColor: '#FCD34D', width: 16, height: 16 }}
              />
              <span className="count">
                <b>{selectedIds.size}</b>명 선택됨
              </span>
              <button className="clear" onClick={() => setSelectedIds(new Set())}>
                선택 해제
              </button>
              <div className="sp" />
              <button className="btn-d">🏷️ 태그 부여</button>
              <button className="btn-d">📁 반 이동</button>
              <button className="btn-d">✉️ 메시지 발송</button>
              <button className="btn-d primary">⚡ AI 처방</button>
              <button className="btn-d danger">🗑️ 삭제</button>
            </div>
          )}
          <table className="dg-bulk-table">
            <thead>
              <tr>
                <th className="check">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === STUDENTS.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="sortable">이름 <span className="sort">↓</span></th>
                <th>반</th>
                <th>상태</th>
                <th className="num sortable">평균 점수</th>
                <th className="num">출석률</th>
                <th>학부모 연락처</th>
                <th>최근 학습</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s) => {
                const isSel = selectedIds.has(s.id);
                return (
                  <tr key={s.id} className={isSel ? 'selected' : undefined}>
                    <td className="check">
                      <input type="checkbox" checked={isSel} onChange={() => toggle(s.id)} />
                    </td>
                    <td className="name">{s.name}</td>
                    <td><span className="grade-tag">{s.grade}</span></td>
                    <td><span className={`status-tag ${s.status}`}>{STATUS_LABEL[s.status]}</span></td>
                    <td className="num" style={s.avg !== null && s.avg < 60 ? { color: 'var(--danger)' } : undefined}>
                      <span className="editable">{s.avg ?? '—'}</span>
                    </td>
                    <td className="num" style={s.attend !== null && s.attend < 80 ? { color: 'var(--danger)' } : { color: s.attend === null ? 'var(--ink-3)' : undefined }}>
                      {s.attend !== null ? `${s.attend}%` : '—'}
                    </td>
                    <td><span className="editable">{s.phone}</span></td>
                    <td>{s.recent}</td>
                    <td className="actions-cell">
                      <button className="row-act">⋯</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="dg-bulk-foot">
            <span>1–{STUDENTS.length} / {STUDENTS.length}명</span>
            <div className="sp" />
            <div className="pager">
              <span className="pg">‹</span>
              <span className="pg on">1</span>
              <span className="pg">2</span>
              <span className="pg">3</span>
              <span className="pg">›</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
