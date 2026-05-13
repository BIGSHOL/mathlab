'use client';

/**
 * Pattern A — 위자드 빌더 프리뷰 (W5)
 *
 * 접근: /preview-wizard
 * 목적: WizardLayoutV1/V2/V3 + 보조 컴포넌트들의 시각 검증.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html
 *
 * 'use client' — useState 로 단계 진행 / 선택 토글을 시연.
 */
import * as React from 'react';
import Link from 'next/link';
import {
  WizardLayoutV1,
  WizardLayoutV2,
  WizardLayoutV3,
  WizardStepperV1,
  WizardProgressV2,
  WizardMiniStepsV3,
  WizardCard,
  WizardBottomBar,
  type WizardStep,
} from '@/components/wizard';

// ── 공통 데모 단계 (4단계 — 숙제 출제 워크플로우) ──
const HOMEWORK_STEPS: WizardStep[] = [
  { id: 'scope', label: '단원 · 범위', sub: '중2 · 이차방정식' },
  { id: 'pick', label: '문제 선택', sub: '8문항 / 10문항 권장' },
  { id: 'assign', label: '학생 배정', sub: '반 · 그룹 · 개별' },
  { id: 'schedule', label: '일정 · 설정', sub: '마감 · 알림 · 채점' },
];

// 5단계 — 시험 만들기 (V2 데모용)
const EXAM_STEPS: WizardStep[] = [
  { id: 'info', label: '시험 정보' },
  { id: 'questions', label: '문제 추가' },
  { id: 'students', label: '학생 배정' },
  { id: 'schedule', label: '일정 · 옵션' },
  { id: 'confirm', label: '최종 확인' },
];

// 3단계 — 학습지 (V3 데모용)
const WORKSHEET_STEPS: WizardStep[] = [
  { id: 'basic', label: '기본' },
  { id: 'compose', label: '구성' },
  { id: 'options', label: '옵션' },
];

const DEMO_QUESTIONS = [
  { num: 1, eq: '$x^2 - 5x + 6 = 0$ 의 해를 구하시오.', diff: 'easy' as const },
  { num: 2, eq: '$2x^2 + 3x - 2 = 0$ 의 두 근의 합은?', diff: 'mid' as const },
  { num: 3, eq: '$x^2 - 4x + k = 0$ 이 중근일 때 $k$ 값은?', diff: 'mid' as const },
  { num: 4, eq: '근의 공식으로 $3x^2 - 7x + 2 = 0$ 풀기', diff: 'mid' as const },
  { num: 5, eq: '$x^2 + 6x + 5 = 0$ 의 두 근의 곱은?', diff: 'easy' as const },
  { num: 6, eq: '$x^2 - 2x - 3 = 0$ 의 해를 모두 구하시오.', diff: 'easy' as const },
  { num: 7, eq: '$x^2 - (a+b)x + ab = 0$ 의 두 근은?', diff: 'hard' as const },
  { num: 8, eq: '$2x^2 - 8x + 6 = 0$ 인수분해 → 해', diff: 'mid' as const },
];

const DIFF_LABEL: Record<'easy' | 'mid' | 'hard', string> = {
  easy: '하',
  mid: '중',
  hard: '상',
};

export default function PreviewWizardPage() {
  // V1 데모 — 현재 단계 = 2 (문제 선택)
  const [v1Idx, setV1Idx] = React.useState(1);
  const [picked, setPicked] = React.useState<Set<number>>(
    new Set([1, 2, 3, 5, 6, 8]),
  );

  // V2 데모 — 현재 단계 = 2 (문제 추가)
  const [v2Idx, setV2Idx] = React.useState(1);
  const [v2Picked, setV2Picked] = React.useState<Set<number>>(new Set([1, 2, 4, 6]));

  // V3 데모 — 현재 단계 = 2 (구성)
  const [v3Idx, setV3Idx] = React.useState(1);
  const [v3Title, setV3Title] = React.useState('중2 이차방정식 — 단원평가 (모의)');
  const [v3Count, setV3Count] = React.useState(10);

  const togglePick = (n: number, set: Set<number>, setter: (s: Set<number>) => void) => {
    const next = new Set(set);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setter(next);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="mb-6">
          <Link href="/preview-v2" className="text-sm text-slate-500 hover:text-slate-700">
            ← /preview-v2
          </Link>
          <h1 className="text-2xl font-black text-slate-900 mt-2">
            Pattern A · 위자드 빌더 (W5)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            시안 <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">data/refact2/pages/pattern-a-wizard-builder-hifi.html</code> ·
            3 변형 (V1 좌측 stepper · V2 가로 progress · V3 실시간 시안)
          </p>
        </div>

        {/* ═════════════ V1 ═════════════ */}
        <Section
          num="V1"
          title="좌측 stepper + 중앙 작업 + 우측 미리보기"
          note="선생님 daily 워크플로우 표준 · 매핑: /homework/create, /homework/concept-create"
        >
          <WizardLayoutV1
            topbar={{
              backHref: '#',
              backLabel: '← 숙제 목록',
              title: `새 숙제 — 단계 ${v1Idx + 1}/4`,
              stepText: `· ${HOMEWORK_STEPS[v1Idx].label}`,
              actions: (
                <>
                  <button className="wz-btn ghost">임시 저장</button>
                  <button
                    className="wz-btn"
                    disabled={v1Idx === 0}
                    onClick={() => setV1Idx((i) => Math.max(0, i - 1))}
                  >
                    이전
                  </button>
                  <button
                    className="wz-btn primary"
                    onClick={() => setV1Idx((i) => Math.min(3, i + 1))}
                  >
                    다음 단계 →
                  </button>
                </>
              ),
            }}
            stepper={
              <WizardStepperV1
                heading="출제 단계"
                steps={HOMEWORK_STEPS}
                currentIndex={v1Idx}
                onSelect={setV1Idx}
                allowSkipAhead
              />
            }
            canvas={
              <>
                <div>
                  <h3>문제 선택</h3>
                  <p className="sub">
                    중2 · 이차방정식 · 근의 공식 · {DEMO_QUESTIONS.length}개 풀에서 선택. 10문항 권장.
                  </p>
                </div>

                <div className="wz-v1-stats">
                  <div className="wz-v1-stat">
                    <div className="lb">선택</div>
                    <div className="val ok">{picked.size} / 10</div>
                  </div>
                  <div className="wz-v1-stat">
                    <div className="lb">예상 풀이</div>
                    <div className="val">{Math.round(picked.size * 1.75)}분</div>
                  </div>
                  <div className="wz-v1-stat">
                    <div className="lb">난이도 평균</div>
                    <div className="val">중</div>
                  </div>
                </div>

                <div className="wz-v1-filters">
                  <span className="wz-chip on">전체</span>
                  <span className="wz-chip">기본형</span>
                  <span className="wz-chip">계산형</span>
                  <span className="wz-chip">활용</span>
                  <span className="wz-chip">난이도 ↑</span>
                  <span className="wz-chip">난이도 ↓</span>
                </div>

                <div className="wz-v1-qlist">
                  {DEMO_QUESTIONS.map((q) => (
                    <div
                      key={q.num}
                      className={`wz-qrow ${picked.has(q.num) ? 'sel' : ''}`}
                      onClick={() => togglePick(q.num, picked, setPicked)}
                    >
                      <span className="qnum">{String(q.num).padStart(2, '0')}</span>
                      <span className="qeq">{q.eq}</span>
                      <span className={`wz-badge diff-${q.diff}`}>{DIFF_LABEL[q.diff]}</span>
                    </div>
                  ))}
                </div>
              </>
            }
            preview={
              <>
                <h4>실시간 요약</h4>
                <div className="summary">
                  <div className="ttl">이차방정식 숙제 #43</div>
                  <div className="meta">
                    중2 · 근의 공식
                    <br />
                    이00 외 24명 → 미배정
                  </div>
                </div>
                <div className="row">
                  <span className="k">단원</span>
                  <span className="v">이차방정식</span>
                </div>
                <div className="row">
                  <span className="k">문항 수</span>
                  <span className="v">{picked.size} / 10</span>
                </div>
                <div className="row">
                  <span className="k">예상 시간</span>
                  <span className="v">{Math.round(picked.size * 1.75)}분</span>
                </div>
                <div className="row">
                  <span className="k">난이도</span>
                  <span className="v">하 3 · 중 3 · 상 2</span>
                </div>
                <div className="row">
                  <span className="k">대상</span>
                  <span className="v" style={{ color: 'var(--ink-3)' }}>미배정</span>
                </div>
                <div className="row">
                  <span className="k">마감</span>
                  <span className="v" style={{ color: 'var(--ink-3)' }}>미설정</span>
                </div>
              </>
            }
          />
        </Section>

        {/* ═════════════ V2 ═════════════ */}
        <Section
          num="V2"
          title="상단 가로 progress + 풀스크린 카드 + sticky 액션"
          note="5단계+ 데이터 입력 위주 · 매핑: /tests/create, /students/enroll, /courses/create"
        >
          <WizardLayoutV2
            topbar={{
              backHref: '#',
              backLabel: '← 시험 목록',
              title: '새 시험 만들기',
              actions: <button className="wz-btn ghost">취소</button>,
            }}
            heading={EXAM_STEPS[v2Idx].label}
            subheading="문제은행에서 가져오거나, 직접 입력하거나, 학습지에서 복사할 수 있습니다."
            progress={
              <WizardProgressV2
                steps={EXAM_STEPS}
                currentIndex={v2Idx}
                onSelect={setV2Idx}
                allowSkipAhead
              />
            }
            canvas={
              <WizardCard
                title="문제 추가"
                subtitle="문제은행에서 가져오거나, 직접 입력하거나, 학습지에서 복사할 수 있습니다."
              >
                <div className="wz-v2-form-row three">
                  <div className="wz-field">
                    <span className="wz-lbl">출처</span>
                    <select className="wz-select">
                      <option>문제은행</option>
                      <option>직접 입력</option>
                      <option>학습지 복사</option>
                    </select>
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">단원</span>
                    <select className="wz-select">
                      <option>중2 · 이차방정식</option>
                    </select>
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">난이도 범위</span>
                    <select className="wz-select">
                      <option>하 · 중 · 상 (전체)</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 8,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-3)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    유형 필터
                  </span>
                  <span className="wz-chip on">객관식</span>
                  <span className="wz-chip">주관식</span>
                  <span className="wz-chip">서술형</span>
                  <span className="wz-chip">OX</span>
                </div>

                <div className="wz-v2-pool">
                  {DEMO_QUESTIONS.slice(0, 6).map((q) => (
                    <div
                      key={q.num}
                      className={`pcard ${v2Picked.has(q.num) ? 'on' : ''}`}
                      onClick={() => togglePick(q.num, v2Picked, setV2Picked)}
                    >
                      <div className="eq">{q.eq}</div>
                      <div className="meta">
                        <span className={`wz-badge diff-${q.diff}`}>{DIFF_LABEL[q.diff]}</span>
                        <span>객관식</span>
                        <span>{Math.floor(Math.random() * 5) + 1}회 출제</span>
                      </div>
                    </div>
                  ))}
                </div>
              </WizardCard>
            }
            bottomBar={
              <WizardBottomBar
                status={
                  <>
                    선택됨 <b>{v2Picked.size}문항</b> · 예상 풀이 <b>{v2Picked.size * 5}분</b>
                  </>
                }
                actions={
                  <>
                    <button
                      className="wz-btn"
                      disabled={v2Idx === 0}
                      onClick={() => setV2Idx((i) => Math.max(0, i - 1))}
                    >
                      이전
                    </button>
                    <button
                      className="wz-btn primary"
                      onClick={() => setV2Idx((i) => Math.min(4, i + 1))}
                    >
                      {v2Idx === 4 ? '저장' : '다음 →'}
                    </button>
                  </>
                }
              />
            }
          />
        </Section>

        {/* ═════════════ V3 ═════════════ */}
        <Section
          num="V3"
          title="좌측 입력(340) + 우측 실시간 시안(1fr)"
          note="인쇄 산출물 즉시 확인 · 매핑: /t/worksheet (학습지 만들기)"
        >
          <WizardLayoutV3
            topbar={{
              backHref: '#',
              backLabel: '← 학습지 목록',
              title: '학습지 만들기',
              actions: (
                <>
                  <button className="wz-btn">PDF 미리보기</button>
                  <button className="wz-btn primary">완료 · 인쇄</button>
                </>
              ),
            }}
            previewLabel="실시간 인쇄 시안 · A4"
            input={
              <>
                <h3>설정</h3>
                <p className="sub">왼쪽 값을 바꾸면 오른쪽 시안이 즉시 갱신됩니다.</p>

                <WizardMiniStepsV3
                  steps={WORKSHEET_STEPS}
                  currentIndex={v3Idx}
                  onSelect={setV3Idx}
                />

                <div className="wz-v3-section">
                  <span className="stitle">제목</span>
                  <input
                    className="wz-input"
                    value={v3Title}
                    onChange={(e) => setV3Title(e.target.value)}
                  />
                </div>

                <div className="wz-v3-section">
                  <span className="stitle">단원 · 범위</span>
                  <select className="wz-select">
                    <option>중2 · 이차방정식 · 근의 공식</option>
                  </select>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    <span className="wz-chip on">근의 공식</span>
                    <span className="wz-chip on">인수분해</span>
                    <span className="wz-chip">완전제곱</span>
                    <span className="wz-chip">판별식</span>
                  </div>
                </div>

                <div className="wz-v3-section">
                  <span className="stitle">난이도 비율</span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 6,
                    }}
                  >
                    <div className="wz-field">
                      <span className="wz-lbl" style={{ textAlign: 'center' }}>하</span>
                      <input
                        className="wz-input"
                        value="30%"
                        readOnly
                        style={{ textAlign: 'center', fontWeight: 700, padding: '8px 6px' }}
                      />
                    </div>
                    <div className="wz-field">
                      <span className="wz-lbl" style={{ textAlign: 'center' }}>중</span>
                      <input
                        className="wz-input"
                        value="50%"
                        readOnly
                        style={{ textAlign: 'center', fontWeight: 700, padding: '8px 6px' }}
                      />
                    </div>
                    <div className="wz-field">
                      <span className="wz-lbl" style={{ textAlign: 'center' }}>상</span>
                      <input
                        className="wz-input"
                        value="20%"
                        readOnly
                        style={{ textAlign: 'center', fontWeight: 700, padding: '8px 6px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden' }}>
                    <span style={{ width: '30%', background: '#7DD3FC' }} />
                    <span style={{ width: '50%', background: '#FCD34D' }} />
                    <span style={{ width: '20%', background: '#FCA5A5' }} />
                  </div>
                </div>

                <div className="wz-v3-section">
                  <span className="stitle">문항 수</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="number"
                      className="wz-input"
                      value={v3Count}
                      onChange={(e) => setV3Count(Math.max(5, Math.min(30, Number(e.target.value) || 10)))}
                      style={{ width: 80, textAlign: 'center' }}
                    />
                    <input
                      type="range"
                      min={5}
                      max={30}
                      value={v3Count}
                      onChange={(e) => setV3Count(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </>
            }
            preview={
              <div className="wz-v3-doc">
                <div className="docttl">{v3Title || '학습지 제목'}</div>
                <div className="docmeta">
                  <span>이름: ____________</span>
                  <span>반: ____</span>
                  <span>날짜: 2026. __. __</span>
                  <span>{v3Count}문항 · {Math.round(v3Count * 2.5)}분</span>
                </div>

                <div className="wz-v3-doc-stats">
                  <div className="ss">
                    <div className="v">{v3Count}</div>
                    <div className="l">문항</div>
                  </div>
                  <div className="ss">
                    <div className="v">
                      {Math.round(v3Count * 0.3)} · {Math.round(v3Count * 0.5)} · {Math.round(v3Count * 0.2)}
                    </div>
                    <div className="l">하·중·상</div>
                  </div>
                  <div className="ss">
                    <div className="v">{Math.round(v3Count * 2.5)}분</div>
                    <div className="l">예상</div>
                  </div>
                  <div className="ss">
                    <div className="v">100점</div>
                    <div className="l">만점</div>
                  </div>
                </div>

                {DEMO_QUESTIONS.slice(0, 3).map((q, i) => (
                  <div key={q.num} className="wz-v3-doc-q">
                    <div className="qhead">
                      문제 {i + 1} · {DIFF_LABEL[q.diff]} · {i === 0 ? 5 : 10}점
                    </div>
                    <div className="qbody">{q.eq}</div>
                    {i < 2 && (
                      <div className="choices">
                        <div className="ch" data-n="①">$x = 1, 6$</div>
                        <div className="ch" data-n="②">$x = 2, 3$</div>
                        <div className="ch" data-n="③">$x = -2, -3$</div>
                        <div className="ch" data-n="④">$x = -1, -6$</div>
                      </div>
                    )}
                  </div>
                ))}

                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    marginTop: 24,
                    paddingTop: 16,
                    borderTop: '1px dashed var(--line)',
                  }}
                >
                  — 1 / 3 페이지 —
                </div>
              </div>
            }
          />
        </Section>

        <div className="mt-8 p-4 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600">
          <b className="text-slate-800">선택 가이드 (시안):</b>{' '}
          /homework/create → V1 · /tests/create + /students/enroll + /courses/create → V2 · /t/worksheet → V3.
          실제 페이지 마이그레이션은 후속 세션에서 페이지별로 진행.
        </div>
      </div>
    </div>
  );
}

function Section({
  num,
  title,
  note,
  children,
}: {
  num: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="inline-block px-2.5 py-1 bg-slate-900 text-white text-xs font-extrabold rounded tracking-wide">
          {num}
        </span>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <p className="text-xs text-slate-500 mb-3">{note}</p>
      {children}
    </section>
  );
}
