'use client';

import { useState } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  onClose: () => void;
}

const REGIONS = ['서울', '경기/인천', '부산/경남', '대구/경북', '광주/전라', '대전/충청', '강원', '제주', '기타'];

export function InquiryModal({ onClose }: Props) {
  const [form, setForm] = useState({
    academyName: '',
    contactName: '',
    phone: '',
    email: '',
    region: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message ?? '오류가 발생했습니다');
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다');
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 */}
      <div className="relative w-full max-w-lg bg-white rounded-[8px] shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-black">도입 문의</h2>
            <p className="text-xs text-slate-500 mt-0.5">남겨주시면 1영업일 내 연락드립니다</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {status === 'done' ? (
          /* 완료 화면 */
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-black mb-1.5">문의가 접수되었습니다</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              담당자가 확인 후 <strong>{form.phone}</strong>으로 연락드리겠습니다.<br />
              평일 기준 1영업일 내 연락드립니다.
            </p>
            <Button className="mt-7" onClick={onClose}>닫기</Button>
          </div>
        ) : (
          /* 폼 */
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="학원명" required>
                <input
                  value={form.academyName}
                  onChange={(e) => set('academyName', e.target.value)}
                  placeholder="정화중수학학원"
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="지역">
                <select
                  value={form.region}
                  onChange={(e) => set('region', e.target.value)}
                  className={inputCls}
                >
                  <option value="">선택 안 함</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="담당자명" required>
                <input
                  value={form.contactName}
                  onChange={(e) => set('contactName', e.target.value)}
                  placeholder="홍길동 원장"
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="연락처" required>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="010-0000-0000"
                  className={inputCls}
                  required
                />
              </Field>
            </div>

            <Field label="이메일">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="example@academy.com (선택)"
                className={inputCls}
              />
            </Field>

            <Field label="문의 내용">
              <textarea
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder="궁금한 점이나 요청 사항을 자유롭게 적어주세요 (선택)"
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </Field>

            {status === 'error' && (
              <p className="text-sm text-red-500">{errorMsg}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
              <Button type="submit" disabled={status === 'loading'}>
                {status === 'loading'
                  ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />전송 중</>
                  : '문의 남기기'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full h-9 px-3 text-sm rounded-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-slate-400';
