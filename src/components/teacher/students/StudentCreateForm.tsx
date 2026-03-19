'use client';

import { Button } from '@/components/ui/Button';
import { gradeLabel } from './helpers';

interface FormData {
  username: string;
  password: string;
  name: string;
  grade: number;
  phone: string;
  parentName: string;
  parentPhone: string;
  school: string;
  birthDate: string;
  email: string;
  address: string;
  startDate: string;
  notes: string;
}

interface StudentCreateFormProps {
  formData: FormData;
  formError: string;
  onFormDataChange: (data: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary';

export function StudentCreateForm({ formData, formError, onFormDataChange, onSubmit, onCancel }: StudentCreateFormProps) {
  const set = (field: keyof FormData, value: string | number) =>
    onFormDataChange({ ...formData, [field]: value });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-lg font-bold text-text-primary mb-1">학생 개별 등록</h2>
        <p className="text-sm text-text-secondary mb-5">학생 계정 정보를 입력하세요.</p>

        <form onSubmit={onSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-sm bg-red-50 border border-red-200 text-red-600 text-sm">{formError}</div>
          )}

          {/* 필수 입력 */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              필수 입력 사항
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  학생 이름 <span className="text-red-500">*</span>
                </label>
                <input className={inputCls} placeholder="이름을 입력하세요." value={formData.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  학년 <span className="text-red-500">*</span>
                </label>
                <select className={inputCls} value={formData.grade} onChange={(e) => set('grade', Number(e.target.value))}>
                  {[1,2,3,4,5,6,7,8,9].map((g) => (
                    <option key={g} value={g}>{gradeLabel(g)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  아이디 <span className="text-red-500">*</span>
                </label>
                <input className={inputCls} placeholder="로그인 아이디" value={formData.username} onChange={(e) => set('username', e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  초기 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input className={inputCls} type="password" placeholder="초기 비밀번호" value={formData.password} onChange={(e) => set('password', e.target.value)} required />
              </div>
            </div>
          </fieldset>

          {/* 선택 입력 */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              선택 입력 사항
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">학생 연락처</label>
                <input className={inputCls} placeholder="숫자만 입력하세요." value={formData.phone} onChange={(e) => set('phone', e.target.value.replace(/[^0-9-]/g, ''))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">학부모 연락처</label>
                <input className={inputCls} placeholder="숫자만 입력하세요." value={formData.parentPhone} onChange={(e) => set('parentPhone', e.target.value.replace(/[^0-9-]/g, ''))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">학교</label>
                <input className={inputCls} placeholder="학교명을 입력하세요." value={formData.school} onChange={(e) => set('school', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">수업 시작일</label>
                <input type="date" className={inputCls} value={formData.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">학생 생년월일</label>
                <input type="date" className={inputCls} value={formData.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">학생 이메일</label>
                <input type="email" className={inputCls} placeholder="예시 : student@math.com" value={formData.email} onChange={(e) => set('email', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">주소</label>
              <input className={inputCls} placeholder="주소를 입력하세요." value={formData.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">비고 및 학생 특이사항</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                placeholder="예시) 문제를 빨리 풀어서 실수가 잦음, 분수 계산이 약함, 중간고사-70점 / 기말고사-94점 등"
                value={formData.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </fieldset>

          <div className="flex gap-3 pt-2">
            <Button type="submit">등록하기</Button>
            <Button type="button" variant="ghost" onClick={onCancel}>취소</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
