'use client';

/**
 * 선생님 작업 큐 — W6-5
 * manifest: /t/queue V1 칸반 신규
 * 시안: data/refact2/pages/pattern-e-kanban-timeline-hifi.html
 *
 * V1 — 칸반 보드 (할 일·진행·검토·완료 4컬럼)
 * V3 — 액티비티 타임라인 (학원 활동 피드)
 *
 * NOTE: 작업 큐 데이터 모델(Task)이 아직 없어 mock으로 시작.
 *       추후 Prisma Task 모델 + API 추가 시 fetch로 교체.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ListTodo, Activity } from 'lucide-react';

type TaskKind = 'urgent' | 'exam' | 'hw' | 'review' | 'meet';
type ColKey = 'todo' | 'doing' | 'review' | 'done';
type AvTone = 'b1' | 'b2' | 'b3' | 'b4' | 'b5';

interface TaskCard {
  id: string;
  tags: Array<{ kind: TaskKind; label: string }>;
  title: string;
  meta?: string;
  due?: { label: string; tone?: 'late' | 'soon' };
  progress?: number;
  ppl?: Array<{ initial: string; tone: AvTone }>;
}

const MOCK_BOARD: Record<ColKey, { name: string; cards: TaskCard[] }> = {
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
      {
        id: 't4',
        tags: [{ kind: 'hw', label: '숙제' }],
        title: '중1-A 절댓값 단원 보강 자료 제작',
        due: { label: 'D-3' },
      },
      {
        id: 't5',
        tags: [{ kind: 'review', label: '분석' }],
        title: '중2-B 기출 분석 보고서 검토',
        due: { label: 'D-5' },
        ppl: [{ initial: '박', tone: 'b1' }],
      },
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
      {
        id: 'd4',
        tags: [{ kind: 'exam', label: '시험' }],
        title: '중2-B 단원평가 주관식 채점',
        meta: '28명 중 22명',
        progress: 79,
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
      {
        id: 'r3',
        tags: [{ kind: 'meet', label: '면담' }],
        title: '위험 학생 4명 처방 계획',
        meta: '학원장 승인 대기',
      },
    ],
  },
  done: {
    name: '완료',
    cards: [
      { id: 'D1', tags: [{ kind: 'hw', label: '숙제' }], title: '4월 마지막 주 숙제 채점', meta: '3일 전' },
      { id: 'D2', tags: [{ kind: 'exam', label: '시험' }], title: '중2-A 단원평가 출제', meta: '5일 전' },
      { id: 'D3', tags: [{ kind: 'review', label: '분석' }], title: '3월 학급별 성취도 리포트', meta: '1주 전' },
      { id: 'D4', tags: [{ kind: 'meet', label: '면담' }], title: '박서윤 학부모 면담', meta: '1주 전' },
      { id: 'D5', tags: [{ kind: 'hw', label: '숙제' }], title: '4월 셋째 주 숙제 출제', meta: '2주 전' },
    ],
  },
};

type ActivityTone = 'success' | 'primary' | 'warn' | 'danger' | 'muted';
interface ActivityItem {
  tone: ActivityTone;
  dot: string;
  who: string;
  time: string;
  desc: string;
  embed?: { ic: string; t: string; s: string; btn?: string; tone?: 'warn' | 'danger' };
  reactions?: Array<{ on?: boolean; label: string }>;
}
interface ActivityDay {
  day: string;
  date: string;
  today?: boolean;
  items: ActivityItem[];
}

const MOCK_TIMELINE: ActivityDay[] = [
  {
    day: '오늘',
    date: '2026.05.13 · 화요일',
    today: true,
    items: [
      {
        tone: 'success',
        dot: '✓',
        who: '숙제 완료',
        time: '방금 전',
        desc: '<b>이지원(중1-A)</b>이 일차방정식 단원평가 20문항 완료 — 정답 18/20',
        embed: { ic: '📝', t: '일차방정식 단원평가지', s: '정답률 90% · 22분 32초', btn: '보기' },
        reactions: [{ on: true, label: '🔥 박선생님' }, { label: '👏 4' }],
      },
      {
        tone: 'primary',
        dot: '▶',
        who: '시험 응시 시작',
        time: '2시간 전',
        desc: '<b>중2-A반</b> 단원평가 시험 응시 시작 (28명 중 24명 응시 중)',
      },
      {
        tone: 'warn',
        dot: '!',
        who: '주의 학생',
        time: '3시간 전',
        desc: '<b>정현우(중1-B)</b> 연속 미응시 3일 — 학부모 알림 필요',
        embed: { ic: '💬', t: '정현우 학습 현황', s: '최근 출석률 72% · 평균 점수 48점', btn: '확인', tone: 'warn' },
      },
    ],
  },
  {
    day: '어제',
    date: '2026.05.12 · 월요일',
    items: [
      {
        tone: 'success',
        dot: '★',
        who: '배지 획득',
        time: '21:14',
        desc: '<b>박서윤(중1-A)</b>이 "7일 연속 학습" 배지 획득',
      },
      {
        tone: 'muted',
        dot: '⏱',
        who: '학습 세션',
        time: '20:32 · 42분',
        desc: '중1-A 반 평균 학습 시간 32분 · 정수와 유리수 단원',
      },
      {
        tone: 'primary',
        dot: '⚡',
        who: '시험 응시 완료',
        time: '14:00 · 60분',
        desc: '<b>중3-A반</b> 4월 모의시험 응시 완료 — 반 평균 81점',
        embed: { ic: '📊', t: '4월 모의시험 결과 리포트', s: '강점: 도형 · 약점: 함수', btn: '리포트' },
      },
    ],
  },
  {
    day: '2일 전',
    date: '2026.05.11 · 일요일',
    items: [
      {
        tone: 'danger',
        dot: '×',
        who: '숙제 미제출',
        time: '23:59 마감',
        desc: '<b>중2-B반</b> 주말 숙제 마감 시간 초과 — 5명 자동 0점 처리',
        embed: { ic: '⚠️', t: '주말 보충 숙제 (12문항)', s: '학부모 5명에게 알림 발송됨', tone: 'danger' },
      },
      {
        tone: 'muted',
        dot: '📥',
        who: '신규 가입',
        time: '15:24',
        desc: '<b>김민준(중1-A)</b> 학생 신규 가입',
      },
    ],
  },
];

export default function QueuePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'kanban' | 'activity'>('kanban');
  const [filter, setFilter] = useState<'all' | 'mine' | 'urgent'>('all');

  // 필터 적용 (Hooks rule: early return 전에 호출)
  const filteredBoard = useMemo(() => {
    if (filter === 'all') return MOCK_BOARD;
    const filterFn = (card: TaskCard) => {
      if (filter === 'urgent') return card.tags.some((t) => t.kind === 'urgent');
      if (filter === 'mine') return card.ppl?.some((p) => p.initial === '박');
      return true;
    };
    return Object.fromEntries(
      Object.entries(MOCK_BOARD).map(([k, v]) => [k, { ...v, cards: v.cards.filter(filterFn) }])
    ) as typeof MOCK_BOARD;
  }, [filter]);

  // 권한 가드 (모든 Hooks 호출 후)
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        로딩 중...
      </div>
    );
  }
  if (!user) {
    router.push('/login');
    return null;
  }

  const totalActive =
    filteredBoard.todo.cards.length +
    filteredBoard.doing.cards.length +
    filteredBoard.review.cards.length;
  const totalDone = filteredBoard.done.cards.length;

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ListTodo className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-text-primary">작업 큐</h1>
          </div>
          <p className="text-xs text-text-secondary">
            처리할 일을 칸반으로 정리하고 학원 활동 흐름을 한눈에 확인하세요.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 4, borderRadius: 8, border: '1px solid var(--line)' }}>
          <button
            onClick={() => setTab('kanban')}
            className={`kt-btn${tab === 'kanban' ? ' primary' : ''}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <ListTodo className="w-3.5 h-3.5" style={{ display: 'inline', marginRight: 4 }} />
            칸반
          </button>
          <button
            onClick={() => setTab('activity')}
            className={`kt-btn${tab === 'activity' ? ' primary' : ''}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <Activity className="w-3.5 h-3.5" style={{ display: 'inline', marginRight: 4 }} />
            액티비티
          </button>
        </div>
      </div>

      {/* ─── V1 칸반 보드 ─── */}
      {tab === 'kanban' && (
        <div className="kt-frame">
          <div className="kt-topbar">
            <span className="title">선생님 작업 보드</span>
            <span className="meta">처리할 일 {totalActive}건 · 완료 {totalDone}건</span>
            <div className="sp" />
            <span
              className={`kt-chip${filter === 'all' ? ' on' : ''}`}
              onClick={() => setFilter('all')}
            >
              전체
            </span>
            <span
              className={`kt-chip${filter === 'mine' ? ' on' : ''}`}
              onClick={() => setFilter('mine')}
            >
              내 담당
            </span>
            <span
              className={`kt-chip${filter === 'urgent' ? ' on' : ''}`}
              onClick={() => setFilter('urgent')}
            >
              긴급
            </span>
            <button className="kt-btn primary">+ 새 작업</button>
          </div>
          <div className="kt-kanban-wrap">
            <div className="kt-kanban">
              {(['todo', 'doing', 'review', 'done'] as const).map((key) => (
                <div key={key} className={`kt-col ${key}`}>
                  <div className="kt-col-head">
                    <span className="dot" />
                    <span className="name">{filteredBoard[key].name}</span>
                    <span className="count">{filteredBoard[key].cards.length}</span>
                    <span className="add" title="작업 추가">＋</span>
                  </div>
                  <div className="kt-col-list">
                    {filteredBoard[key].cards.length === 0 ? (
                      <div
                        style={{
                          padding: 18,
                          textAlign: 'center',
                          color: 'var(--ink-3)',
                          fontSize: 12,
                          border: '1px dashed var(--line)',
                          borderRadius: 10,
                        }}
                      >
                        작업 없음
                      </div>
                    ) : (
                      filteredBoard[key].cards.map((card) => (
                        <div key={card.id} className="kt-kcard">
                          {card.tags.length > 0 && (
                            <div className="tags">
                              {card.tags.map((t, i) => (
                                <span key={i} className={`tag ${t.kind}`}>
                                  {t.label}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="title">{card.title}</div>
                          {(card.due || card.meta) && (
                            <div className="kmeta">
                              {card.due && (
                                <span className={`due ${card.due.tone ?? ''}`}>
                                  {card.due.label}
                                </span>
                              )}
                              {card.meta && <span>{card.meta}</span>}
                            </div>
                          )}
                          {card.progress !== undefined && (
                            <div className="progress-mini">
                              <span style={{ width: `${card.progress}%` }} />
                            </div>
                          )}
                          {card.ppl && card.ppl.length > 0 && (
                            <div className="ppl">
                              {card.ppl.map((p, i) => (
                                <div key={i} className={`av ${p.tone}`}>
                                  {p.initial}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── V3 액티비티 타임라인 ─── */}
      {tab === 'activity' && (
        <div className="kt-frame">
          <div className="kt-topbar">
            <span className="title">학원 활동 피드</span>
            <span className="meta">최근 3일 · 활동 {MOCK_TIMELINE.flatMap((d) => d.items).length}건</span>
            <div className="sp" />
            <button className="kt-btn">📤 학부모에게 공유</button>
            <button className="kt-btn">📥 활동 내보내기</button>
          </div>
          <div className="kt-activity-wrap">
            <div className="kt-act-main">
              <div className="kt-timeline">
                {MOCK_TIMELINE.map((day, di) => (
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
                          {it.embed && (
                            <div className="embed">
                              <div className={`ic${it.embed.tone ? ' ' + it.embed.tone : ''}`}>
                                {it.embed.ic}
                              </div>
                              <div className="info">
                                <div className="t">{it.embed.t}</div>
                                <div className="s">{it.embed.s}</div>
                              </div>
                              {it.embed.btn && <button className="btn-sm">{it.embed.btn}</button>}
                            </div>
                          )}
                          {it.reactions && it.reactions.length > 0 && (
                            <div className="reactions">
                              {it.reactions.map((r, ri) => (
                                <span key={ri} className={`react${r.on ? ' on' : ''}`}>
                                  {r.label}
                                </span>
                              ))}
                              <span className="react">＋</span>
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
                <div className="it on">
                  📊 전체 <span className="cnt">{MOCK_TIMELINE.flatMap((d) => d.items).length}</span>
                </div>
                <div className="it">
                  ✓ 완료 <span className="cnt">{MOCK_TIMELINE.flatMap((d) => d.items).filter((i) => i.tone === 'success').length}</span>
                </div>
                <div className="it">
                  ⚡ 시험 <span className="cnt">{MOCK_TIMELINE.flatMap((d) => d.items).filter((i) => i.who.includes('시험')).length}</span>
                </div>
                <div className="it">
                  ! 주의 <span className="cnt">{MOCK_TIMELINE.flatMap((d) => d.items).filter((i) => i.tone === 'warn' || i.tone === 'danger').length}</span>
                </div>
              </div>
              <h4>기간</h4>
              <div className="kt-act-filter-list">
                <div className="it on">최근 3일</div>
                <div className="it">최근 14일</div>
                <div className="it">학기 전체</div>
              </div>
              <h4>요약</h4>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>처리할 일</span>
                  <b style={{ color: 'var(--ink)' }}>{totalActive}건</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>완료</span>
                  <b style={{ color: 'var(--success)' }}>{totalDone}건</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>긴급</span>
                  <b style={{ color: 'var(--danger)' }}>
                    {Object.values(MOCK_BOARD)
                      .flatMap((c) => c.cards)
                      .filter((c) => c.tags.some((t) => t.kind === 'urgent')).length}
                    건
                  </b>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* 안내 */}
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--ink-3)',
          lineHeight: 1.7,
        }}
      >
        <b style={{ color: 'var(--ink)' }}>💡 작업 큐 시스템</b> — 현재 mock 데이터로 표시 중입니다.
        실 데이터(채점 대기, 시험 출제 예정, 학부모 면담 등) 연동은 Task 모델 도입 후 진행됩니다.
      </div>
    </div>
  );
}
