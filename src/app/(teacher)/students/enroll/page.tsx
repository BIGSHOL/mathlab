'use client';

/**
 * 신규 원생 등록 위자드 — Pattern A V2 적용 (W5).
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V2
 *
 * 매니페스트 V2 권장 페이지 — 데이터 입력 위주 + 명확한 시작/끝 흐름.
 *
 * 3단계 흐름:
 *   1) 기본 정보 (이름/아이디/비밀번호 + 선택 입력)
 *   2) 학년 / 반 배정
 *   3) 완료 & 진단 (POST /api/users 결과 + 다음 액션)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ClipboardCheck, Eye, EyeOff } from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import {
  WizardLayoutV2,
  WizardProgressV2,
  WizardCard,
  WizardBottomBar,
  type WizardStep,
} from '@/components/wizard';

type Step = 1 | 2 | 3;

const STEPS: WizardStep[] = [
  { id: 'basic', label: '기본 정보' },
  { id: 'grade', label: '학년 / 반 배정' },
  { id: 'done', label: '완료 & 진단' },
];

export default function EnrollWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdStudentSeq, setCreatedStudentSeq] = useState<number | null>(null);
  const [showPw, setShowPw] = useState(false);

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '1234',
    grade: 7,
    phone: '',
    parentName: '',
    parentPhone: '',
    school: '',
    birthDate: '',
    email: '',
    address: '',
    startDate: '',
    notes: '',
  });

  const canNext = () => {
    if (step === 1) return Boolean(form.name.trim() && form.username.trim() && form.password.trim());
    return true;
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? '생성 실패');
        setSubmitting(false);
        return;
      }
      const json = await res.json();
      setCreatedStudentSeq(json.data?.seq ?? null);
      setStep(3);
    } catch {
      setError('네트워크 오류');
    }
    setSubmitting(false);
  };

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) handleCreate();
  };

  const currentIndex = step - 1;
  const isCompletion = step === 3;

  return (
    <WizardLayoutV2
      topbar={{
        backHref: '/students',
        backLabel: '← 학생 관리',
        title: '신규 원생 등록',
        actions: !isCompletion ? (
          <button className="wz-btn ghost" type="button" onClick={() => router.push('/students')}>
            취소
          </button>
        ) : undefined,
      }}
      heading={
        step === 1
          ? '기본 정보를 입력해 주세요'
          : step === 2
            ? '학년을 선택해 주세요'
            : '등록 완료!'
      }
      subheading={
        step === 1
          ? '학생 이름과 로그인 정보가 필요합니다. 나머지는 나중에 채워도 됩니다.'
          : step === 2
            ? '학년별 추천 단원과 진단평가가 자동으로 매칭됩니다.'
            : `${form.name} 학생이 성공적으로 등록되었습니다.`
      }
      progress={
        <WizardProgressV2
          steps={STEPS}
          currentIndex={currentIndex}
          // 사용자 임의 점프 차단 (데이터 무결성)
          onSelect={undefined}
        />
      }
      canvas={
        <WizardCard>
          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* 필수 입력 */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                  필수 입력 사항
                </legend>
                <div className="wz-v2-form-row">
                  <div className="wz-field">
                    <span className="wz-lbl">
                      학생 이름 <span className="text-red-500">*</span>
                    </span>
                    <input
                      className="wz-input"
                      placeholder="이름을 입력하세요."
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">
                      아이디 <span className="text-red-500">*</span>
                    </span>
                    <input
                      className="wz-input"
                      placeholder="로그인 아이디"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                  </div>
                </div>
                <div className="wz-field">
                  <span className="wz-lbl">
                    초기 비밀번호 <span className="text-red-500">*</span>
                  </span>
                  <div className="relative">
                    <input
                      className="wz-input"
                      style={{ paddingRight: 36 }}
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    기본값: 1234. 학생이 첫 로그인 후 변경을 권장합니다.
                  </p>
                </div>
              </fieldset>

              {/* 선택 입력 */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                  선택 입력 사항
                </legend>
                <div className="wz-v2-form-row">
                  <div className="wz-field">
                    <span className="wz-lbl">학생 연락처</span>
                    <input
                      className="wz-input"
                      placeholder="숫자만 입력하세요."
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value.replace(/[^0-9-]/g, '') })
                      }
                    />
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">학부모 연락처</span>
                    <input
                      className="wz-input"
                      placeholder="숫자만 입력하세요."
                      value={form.parentPhone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          parentPhone: e.target.value.replace(/[^0-9-]/g, ''),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="wz-v2-form-row">
                  <div className="wz-field">
                    <span className="wz-lbl">학교</span>
                    <input
                      className="wz-input"
                      placeholder="학교명을 입력하세요."
                      value={form.school}
                      onChange={(e) => setForm({ ...form, school: e.target.value })}
                    />
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">수업 시작일</span>
                    <input
                      type="date"
                      className="wz-input"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="wz-v2-form-row">
                  <div className="wz-field">
                    <span className="wz-lbl">학생 생년월일</span>
                    <input
                      type="date"
                      className="wz-input"
                      value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    />
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">학생 이메일</span>
                    <input
                      type="email"
                      className="wz-input"
                      placeholder="예시 : student@math.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="wz-field">
                  <span className="wz-lbl">주소</span>
                  <input
                    className="wz-input"
                    placeholder="주소를 입력하세요."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="wz-field">
                  <span className="wz-lbl">비고 및 학생 특이사항</span>
                  <textarea
                    className="wz-input"
                    style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                    placeholder="예시) 문제를 빨리 풀어서 실수가 잦음, 분수 계산이 약함, 중간고사-70점 / 기말고사-94점 등"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </fieldset>
            </div>
          )}

          {/* ── Step 2: Grade ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="wz-field">
                <span className="wz-lbl">학년 선택</span>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, grade: g })}
                      className={`py-3 rounded-sm text-sm font-semibold transition-all border ${
                        form.grade === g
                          ? 'bg-primary text-white border-primary shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                      }`}
                    >
                      {g <= 6 ? `초등 ${g}학년` : `중등 ${g - 6}학년`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 rounded-sm p-4 text-xs text-blue-700">
                <strong>{form.name}</strong> 학생을{' '}
                <strong>
                  {form.grade <= 6
                    ? `초등 ${form.grade}학년`
                    : `중등 ${form.grade - 6}학년`}
                </strong>
                으로 등록합니다.
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Complete ── */}
          {step === 3 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">등록 완료!</h2>
              <p className="text-sm text-slate-500">
                <strong>{form.name}</strong> 학생이 성공적으로 등록되었습니다.
              </p>
              <div className="bg-slate-50 rounded-sm p-4 text-left text-sm space-y-1 max-w-md mx-auto">
                <p>
                  <span className="text-slate-500">이름:</span>{' '}
                  <strong>{form.name}</strong>
                </p>
                <p>
                  <span className="text-slate-500">아이디:</span>{' '}
                  <strong>{form.username}</strong>
                </p>
                <p>
                  <span className="text-slate-500">학년:</span>{' '}
                  <strong>
                    {form.grade <= 6
                      ? `초등 ${form.grade}학년`
                      : `중등 ${form.grade - 6}학년`}
                  </strong>
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {createdStudentSeq && (
                  <button
                    className="wz-btn"
                    type="button"
                    onClick={() =>
                      router.push(`/students/${createdStudentSeq}/wrong-answers`)
                    }
                  >
                    학생 관리 페이지
                  </button>
                )}
                <button
                  className="wz-btn primary"
                  type="button"
                  onClick={() => router.push('/diagnostics')}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  진단평가 배정
                </button>
              </div>
            </div>
          )}
        </WizardCard>
      }
      bottomBar={
        !isCompletion ? (
          <WizardBottomBar
            status={
              <>
                단계 <b>{step}</b> / 3 · {step === 1 ? '필수 입력 확인' : '학년 배정'}
              </>
            }
            actions={
              <>
                <button
                  type="button"
                  className="wz-btn"
                  onClick={() =>
                    step > 1 ? setStep((step - 1) as Step) : router.push('/students')
                  }
                >
                  ← {step === 1 ? '취소' : '이전'}
                </button>
                <button
                  type="button"
                  className="wz-btn primary"
                  onClick={handleNext}
                  disabled={!canNext() || submitting}
                >
                  {submitting && <MathSpinner size="sm" />}
                  {step === 2 ? '등록하기' : '다음 →'}
                </button>
              </>
            }
          />
        ) : undefined
      }
    />
  );
}
