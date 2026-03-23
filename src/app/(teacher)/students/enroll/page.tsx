'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Check,
  GraduationCap,
  ClipboardCheck,
} from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1 as Step, label: '기본 정보', icon: UserPlus },
  { num: 2 as Step, label: '학년 / 반 배정', icon: GraduationCap },
  { num: 3 as Step, label: '완료 & 진단', icon: ClipboardCheck },
];

export default function EnrollWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdStudentSeq, setCreatedStudentSeq] = useState<number | null>(null);

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
    if (step === 1) return form.name.trim() && form.username.trim() && form.password.trim();
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

  return (
    <div className="p-6 md:p-10 max-w-[640px] mx-auto w-full flex flex-col gap-6">
      <PageHeader
        title="신규 원생 등록"
        subtitle="간편하게 학생을 등록하고 학습을 시작합니다."
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold flex-1 transition-all ${
                isActive ? 'bg-primary text-white' :
                isDone ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-100 text-text-secondary'
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
            </div>
          );
        })}
      </div>

      <Card padding="md">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-5">
            {/* 필수 입력 */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">필수 입력 사항</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">학생 이름 <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="이름을 입력하세요."
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">아이디 <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="로그인 아이디"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">초기 비밀번호 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="text-xs text-text-secondary mt-1">기본값: 1234. 학생이 첫 로그인 후 변경을 권장합니다.</p>
              </div>
            </fieldset>

            {/* 선택 입력 */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">선택 입력 사항</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">학생 연락처</label>
                  <input
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="숫자만 입력하세요."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9-]/g, '') })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">학부모 연락처</label>
                  <input
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="숫자만 입력하세요."
                    value={form.parentPhone}
                    onChange={(e) => setForm({ ...form, parentPhone: e.target.value.replace(/[^0-9-]/g, '') })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">학교</label>
                  <input
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="학교명을 입력하세요."
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">수업 시작일</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">학생 생년월일</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">학생 이메일</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="예시 : student@math.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">주소</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="주소를 입력하세요."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">비고 및 학생 특이사항</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[80px] resize-y"
                  placeholder="예시) 문제를 빨리 풀어서 실수가 잦음, 분수 계산이 약함, 중간고사-70점 / 기말고사-94점 등"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </fieldset>
          </div>
        )}

        {/* Step 2: Grade */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary mb-2">학년 배정</h2>
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-2 block">학년 선택</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, grade: g })}
                    className={`py-3 rounded-sm text-sm font-semibold transition-all border ${
                      form.grade === g
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-text-secondary border-slate-200 hover:border-primary/50'
                    }`}
                  >
                    {g <= 6 ? `초등 ${g}학년` : `중등 ${g - 6}학년`}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-blue-50 rounded-sm p-4 text-xs text-blue-700">
              <strong>{form.name}</strong> 학생을{' '}
              <strong>{form.grade <= 6 ? `초등 ${form.grade}학년` : `중등 ${form.grade - 6}학년`}</strong>으로 등록합니다.
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">등록 완료!</h2>
            <p className="text-sm text-text-secondary">
              <strong>{form.name}</strong> 학생이 성공적으로 등록되었습니다.
            </p>
            <div className="bg-slate-50 rounded-sm p-4 text-left text-sm space-y-1">
              <p><span className="text-text-secondary">이름:</span> <strong>{form.name}</strong></p>
              <p><span className="text-text-secondary">아이디:</span> <strong>{form.username}</strong></p>
              <p><span className="text-text-secondary">학년:</span> <strong>{form.grade <= 6 ? `초등 ${form.grade}학년` : `중등 ${form.grade - 6}학년`}</strong></p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              {createdStudentSeq && (
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/students/${createdStudentSeq}/wrong-answers`)}
                >
                  학생 관리 페이지
                </Button>
              )}
              <Button onClick={() => router.push('/diagnostics')}>
                <ClipboardCheck className="w-4 h-4 mr-1" />
                진단평가 배정
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation */}
      {step < 3 && (
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep((step - 1) as Step) : router.push('/students')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 1 ? '취소' : '이전'}
          </Button>
          <Button onClick={handleNext} disabled={!canNext() || submitting}>
            {submitting ? (
              <MathSpinner size="sm" className="mr-1" />
            ) : null}
            {step === 2 ? '등록하기' : '다음'}
            {step < 2 && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      )}
    </div>
  );
}
