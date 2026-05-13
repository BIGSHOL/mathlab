/**
 * 온보딩 V2 — Pattern A V2 위자드 빌더 적용 (W5).
 * 시안: data/refact2/pages/landing-auth-hifi.html § S3 + pattern-a-wizard-builder-hifi.html § V2
 *
 * 5단계 학원장 셋업 흐름:
 *   1) 학원 정보       — 지점명/주소
 *   2) 학교 선택       — 우리 학원이 다루는 학교 DB
 *   3) 첫 반 생성      — 반 이름/학년/레벨/시작 단원
 *   4) 학생 초대       — 초대 코드 + 공유 방법
 *   5) 완료            — 셋업 완료 + 대시보드 진입
 *
 * 5단계 = 시안 가이드 권장 V2 (가로 progress).
 * 매니페스트 #2(/onboarding) — 본 페이지는 v2 라우트 시안용 (실제 백엔드 연동 X, 클라이언트 state).
 */
'use client';

import * as React from 'react';
import {
  WizardLayoutV2,
  WizardProgressV2,
  WizardCard,
  WizardBottomBar,
  type WizardStep,
} from '@/components/wizard';

// ── 5단계 정의 (시안 매니페스트) ──
const STEPS: WizardStep[] = [
  { id: 'academy', label: '학원 정보' },
  { id: 'schools', label: '학교 선택' },
  { id: 'class', label: '첫 반 생성' },
  { id: 'invite', label: '학생 초대' },
  { id: 'done', label: '완료' },
];

// ── 시안의 학교 옵션 (목업, 추후 School DB 연동) ──
const SCHOOL_OPTIONS = [
  { code: 'M01', name: '대치중학교', sub: '서울 강남구' },
  { code: 'M02', name: '구룡중학교', sub: '서울 강남구' },
  { code: 'M03', name: '대청중학교', sub: '서울 강남구' },
  { code: 'M04', name: '대명중학교', sub: '서울 강남구' },
  { code: 'M05', name: '단대부고', sub: '서울 강남구' },
  { code: 'M06', name: '숙명여고', sub: '서울 강남구' },
];

// ── 시안의 시작 단원 옵션 ──
const SUBJECT_PICKS = [
  { ico: '📐', nm: '인수분해', sub: '중2 1학기' },
  { ico: '📊', nm: '이차방정식', sub: '중2 1학기' },
  { ico: '📈', nm: '이차함수', sub: '중2 2학기' },
  { ico: '🔢', nm: '통계', sub: '중2 2학기' },
];

const GRADE_OPTIONS = [
  '중학교 1학년',
  '중학교 2학년',
  '중학교 3학년',
  '고등학교 1학년',
  '고등학교 2학년',
  '고등학교 3학년',
];
const LEVEL_OPTIONS = ['기초', '표준', '심화', '특별 (영재/올림피아드)'];

const INVITE_CODE = 'KML397';

export default function OnboardingWizardPage() {
  const [step, setStep] = React.useState(0);

  // ── 입력 상태 ──
  // Step 1
  const [academyName, setAcademyName] = React.useState('');
  const [region, setRegion] = React.useState('서울 강남구');
  const [contact, setContact] = React.useState('');
  // Step 2
  const [selectedSchools, setSelectedSchools] = React.useState<Set<string>>(
    new Set(['M01', 'M02']),
  );
  // Step 3
  const [className, setClassName] = React.useState('중2 A반 (월·수·금 7시)');
  const [grade, setGrade] = React.useState('중학교 2학년');
  const [level, setLevel] = React.useState('표준');
  const [selectedTopic, setSelectedTopic] = React.useState('인수분해');
  // Step 4
  const [copied, setCopied] = React.useState(false);

  const toggleSchool = (code: string) => {
    const next = new Set(selectedSchools);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelectedSchools(next);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 무시 — 일부 환경(특히 데모/v2 라우트) 에서는 clipboard API 가 막힐 수 있음
    }
  };

  // ── 단계별 검증 (다음 버튼 활성/비활성) ──
  const canProceed = (() => {
    switch (step) {
      case 0:
        return academyName.trim().length >= 2;
      case 1:
        return selectedSchools.size > 0;
      case 2:
        return className.trim().length >= 2;
      case 3:
        return true; // 학생 초대는 건너뛸 수 있음
      default:
        return true;
    }
  })();

  const isCompletion = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <WizardLayoutV2
        topbar={{
          backHref: '/v2',
          backLabel: '← 인덱스',
          title: '학원 셋업',
          actions: !isCompletion ? (
            <button className="wz-btn ghost" type="button">
              나중에 (대시보드로)
            </button>
          ) : undefined,
        }}
        heading={
          step === 0
            ? '어떤 학원이신가요?'
            : step === 1
              ? '학생들이 다니는 학교를 골라주세요'
              : step === 2
                ? '첫 번째 반을 만들어볼까요?'
                : step === 3
                  ? '학생들에게 코드를 보내주세요'
                  : '셋업 완료!'
        }
        subheading={
          step === 0
            ? '지점명과 위치를 입력하면 학원 대시보드를 만들어 드려요.'
            : step === 1
              ? '여러 학교를 선택할 수 있어요. 학생 가입 시 이 목록에서 학교를 고르게 됩니다.'
              : step === 2
                ? '반은 학생을 묶는 단위입니다. 시간표나 학년/레벨로 나누면 좋아요. 나중에 더 만들 수 있어요.'
                : step === 3
                  ? '학생은 mathlab.app/join 에서 이 코드만 입력하면 바로 가입됩니다.'
                  : '이제 학생을 초대하고 첫 시험을 출제해 보세요.'
        }
        progress={
          <WizardProgressV2
            steps={STEPS}
            currentIndex={step}
            onSelect={setStep}
            allowSkipAhead={false}
          />
        }
        canvas={
          <WizardCard>
            {step === 0 && (
              <>
                <div className="wz-v2-form-row">
                  <div className="wz-field">
                    <span className="wz-lbl">지점명</span>
                    <input
                      className="wz-input"
                      placeholder="예: 매스랩 강남대치점"
                      value={academyName}
                      onChange={(e) => setAcademyName(e.target.value)}
                    />
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">지역</span>
                    <select
                      className="wz-select"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    >
                      <option>서울 강남구</option>
                      <option>서울 서초구</option>
                      <option>서울 송파구</option>
                      <option>경기 분당구</option>
                      <option>경기 일산</option>
                    </select>
                  </div>
                </div>

                <div className="wz-field">
                  <span className="wz-lbl">대표 연락처 (선택)</span>
                  <input
                    type="tel"
                    className="wz-input"
                    placeholder="010-0000-0000"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  💡 지점명은 학생 앱에 표시되며 가입 후 변경 가능합니다.
                </p>
              </>
            )}

            {step === 1 && (
              <>
                <div className="wz-v2-pool">
                  {SCHOOL_OPTIONS.map((s) => (
                    <div
                      key={s.code}
                      className={`pcard ${selectedSchools.has(s.code) ? 'on' : ''}`}
                      onClick={() => toggleSchool(s.code)}
                    >
                      <div className="eq">{s.name}</div>
                      <div className="meta">
                        <span>{s.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  💡 선택한 학교 학생만 가입 가능합니다. 추후 학교 DB 페이지에서 추가/제외할 수
                  있어요.
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <div className="wz-field" style={{ marginBottom: 16 }}>
                  <span className="wz-lbl">반 이름</span>
                  <input
                    className="wz-input"
                    placeholder="예: 중2 A반 / 고1 심화반 / 화목 6시반"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>

                <div className="wz-v2-form-row">
                  <div className="wz-field">
                    <span className="wz-lbl">학년</span>
                    <select
                      className="wz-select"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">레벨</span>
                    <select
                      className="wz-select"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                    >
                      {LEVEL_OPTIONS.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="wz-field" style={{ marginTop: 8 }}>
                  <span className="wz-lbl">📚 시작 단원</span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    {SUBJECT_PICKS.map((s) => {
                      const on = selectedTopic === s.nm;
                      return (
                        <div
                          key={s.nm}
                          className={`pcard ${on ? 'on' : ''}`}
                          style={{
                            padding: '14px 8px',
                            textAlign: 'center',
                            borderRadius: 'var(--r)',
                            border: `1.5px solid ${on ? 'var(--primary)' : 'var(--line)'}`,
                            background: on ? 'var(--primary-50)' : 'var(--bg-2)',
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedTopic(s.nm)}
                        >
                          <span style={{ fontSize: 22, display: 'block', marginBottom: 6 }}>
                            {s.ico}
                          </span>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{s.nm}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                            {s.sub}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div
                  className="wz-field"
                  style={{ marginBottom: 16, alignItems: 'center' }}
                >
                  <span className="wz-lbl" style={{ textAlign: 'center' }}>
                    학생 초대 코드
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '18px 20px',
                      background: 'var(--primary-50)',
                      border: '1.5px solid var(--primary)',
                      borderRadius: 'var(--r)',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        letterSpacing: '0.3em',
                        color: 'var(--primary)',
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {INVITE_CODE.split('').join(' ')}
                    </div>
                    <button
                      type="button"
                      className="wz-btn"
                      onClick={handleCopyCode}
                      style={{ marginLeft: 12 }}
                    >
                      {copied ? '✓ 복사됨' : '📋 복사'}
                    </button>
                  </div>
                </div>

                <div
                  className="wz-v2-pool"
                  style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
                >
                  <div className="pcard" style={{ cursor: 'pointer' }}>
                    <div className="eq" style={{ fontSize: 14 }}>
                      💬 카카오톡 공유
                    </div>
                    <div className="meta">
                      <span>학생들에게 링크 + 코드 메시지 전송</span>
                    </div>
                  </div>
                  <div className="pcard" style={{ cursor: 'pointer' }}>
                    <div className="eq" style={{ fontSize: 14 }}>
                      🖨️ 인쇄용 안내문
                    </div>
                    <div className="meta">
                      <span>A4 1장 PDF — 학원 게시용</span>
                    </div>
                  </div>
                  <div className="pcard" style={{ cursor: 'pointer' }}>
                    <div className="eq" style={{ fontSize: 14 }}>
                      🔗 가입 링크 복사
                    </div>
                    <div className="meta">
                      <span>mathlab.app/join/{INVITE_CODE}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  💡 학생은 코드 입력 → 학교 선택 → 이름 → 비밀번호 4단계로 30초 안에 가입합니다.
                </p>
              </>
            )}

            {step === 4 && (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">🎉</div>
                <h3 style={{ marginBottom: 8 }}>
                  {academyName || '매스랩'} 셋업 완료!
                </h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  {selectedSchools.size}개 학교 · {className} 반 · 초대 코드{' '}
                  <b style={{ color: 'var(--primary)' }}>{INVITE_CODE}</b> 가
                  준비됐어요.
                  <br />
                  이제 학생을 초대하고 첫 시험을 출제해 보세요.
                </p>

                <div
                  className="wz-v2-pool"
                  style={{ gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'left' }}
                >
                  <div className="pcard" style={{ cursor: 'pointer' }}>
                    <div className="eq" style={{ fontSize: 14 }}>
                      📊 대시보드 둘러보기
                    </div>
                    <div className="meta">
                      <span>학원장 화면 진입</span>
                    </div>
                  </div>
                  <div className="pcard" style={{ cursor: 'pointer' }}>
                    <div className="eq" style={{ fontSize: 14 }}>
                      📝 첫 시험 출제
                    </div>
                    <div className="meta">
                      <span>4단계 빌더 — 5분 소요</span>
                    </div>
                  </div>
                  <div className="pcard" style={{ cursor: 'pointer' }}>
                    <div className="eq" style={{ fontSize: 14 }}>
                      🎯 진단평가 시작
                    </div>
                    <div className="meta">
                      <span>학생 레벨 자동 분석</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </WizardCard>
        }
        bottomBar={
          <WizardBottomBar
            status={
              !isCompletion ? (
                <>
                  단계 <b>{step + 1}</b> / {STEPS.length}
                </>
              ) : (
                <span>모든 셋업이 완료됐어요</span>
              )
            }
            actions={
              <>
                {!isCompletion && (
                  <>
                    <button
                      type="button"
                      className="wz-btn"
                      disabled={step === 0}
                      onClick={() => setStep((i) => Math.max(0, i - 1))}
                    >
                      ← 이전
                    </button>
                    <button
                      type="button"
                      className="wz-btn primary"
                      disabled={!canProceed}
                      onClick={() => setStep((i) => Math.min(STEPS.length - 1, i + 1))}
                    >
                      {step === STEPS.length - 2 ? '완료 →' : '다음 →'}
                    </button>
                  </>
                )}
                {isCompletion && (
                  <button type="button" className="wz-btn primary">
                    대시보드로 이동 →
                  </button>
                )}
              </>
            }
          />
        }
      />
    </div>
  );
}
